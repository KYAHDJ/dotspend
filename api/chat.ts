// Vercel Serverless Function — secure Groq proxy for the DotSpend AI Financial
// Butler. The Groq API key is read from the SERVER environment so it is never
// exposed to the browser. The financial context is sent by the client as a
// structured object and turned into a "Financial Butler" system prompt here on
// the server (so prompt logic also stays out of the bundle).
//
// Deploy: push this repo to Vercel, then set environment variable `GROQ_API_KEY`
// in the Vercel project (Settings -> Environment Variables).
//
// Local dev: run `vercel dev` — it compiles this function and exposes
// `GROQ_API_KEY` from your local `vercel env`. It is NOT a Vite env var.
//
// This proxies Groq's streaming chat completions and re-streams deltas to the
// client as Server-Sent Events so the frontend can render text live.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const LIGHT_MODEL = "llama3-8b-8192";

interface FinancialContext {
  profileName: string;
  dailyBudget: number;
  spentToday: number;
  remaining: number;
  itemsToday: number;
  weekTotal: number;
  monthTotal: number;
  expensesToday: Array<{ label: string; amount: number; category: string }>;
}

interface ChatRequestBody {
  model?: string;
  user: string;
  history?: { role: "user" | "assistant"; content: string }[];
  context: FinancialContext;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function buildSystemPrompt(ctx: FinancialContext): string {
  const c = ctx || ({} as FinancialContext);
  return [
    `You are DotSpend AI, a concise, encouraging, financial-focused personal butler app for "${c.profileName || "the user"}".`,
    "Rules:",
    "- Keep every reply SHORT (3-6 sentences unless the user explicitly asks for detail).",
    "- Only reference the real numbers provided in context below; never invent expenses or amounts.",
    "- Always frame amounts in the user's currency and keep the same symbol consistently.",
    "- Be warm, supportive and practical, and always end with 1-3 concrete actionable suggestions.",
    "Structured financial context (today unless stated):",
    `- Daily budget: ${fmt(c.dailyBudget)}`,
    `- Spent today: ${fmt(c.spentToday)} across ${c.itemsToday || 0} expense item(s)`,
    `- Remaining today: ${fmt(Math.max(0, c.remaining || 0))}`,
    `- This week total: ${fmt(c.weekTotal)}`,
    `- This month total: ${fmt(c.monthTotal)}`,
    `- Today's expenses: ${JSON.stringify(c.expensesToday || [])}`,
    "Never mention that you are an AI or that you received programmatic context.",
  ].join("\n");
}

// Minimal SSE-friendly JSON stream parser over a fetch Response body.
async function* parseSSE(
  res: Response
): AsyncGenerator<{ content?: string; done: boolean }> {
  if (!res.body) {
    yield { done: true };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            yield { done: true };
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json?.choices?.[0]?.delta?.content;
            if (content) yield { content, done: false };
          } catch {
            /* ignore partial/fragmented lines */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function groqStream(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
  return fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
}

async function pipeStream(upstream: Response, res: VercelResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    for await (const chunk of parseSSE(upstream)) {
      if (chunk.done) break;
      res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } finally {
    res.end();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "GROQ_API_KEY is not configured on the server. Set it in the Vercel project environment variables.",
    });
  }

  const body = (req.body || {}) as ChatRequestBody;
  const user = typeof body.user === "string" ? body.user.trim() : "";
  if (!user) {
    return res.status(400).json({ error: "Missing user message" });
  }

  const model = body.model || DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(body.context);

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];
  if (Array.isArray(body.history)) {
    for (const h of body.history.slice(-6)) {
      if (h && (h.role === "user" || h.role === "assistant") && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }
  messages.push({ role: "user", content: user });

  try {
    let upstream = await groqStream(apiKey, model, messages);

    // Fall back to a lighter model once if the primary model is unavailable.
    if (!upstream.ok && upstream.status === 404 && model === DEFAULT_MODEL) {
      upstream = await groqStream(apiKey, LIGHT_MODEL, messages);
    }

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text || "Groq error" });
    }

    return pipeStream(upstream, res);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Proxy error",
    });
  }
}
