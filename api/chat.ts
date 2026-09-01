// Vercel Serverless Function — secure Groq proxy for the DotSpend AI Financial
// Butler. The Groq API key is read from the SERVER environment so it is never
// exposed to the browser. The financial context is sent by the client as a
// structured object and turned into a "Financial Butler" system prompt here on
// the server (so prompt logic also stays out of the bundle).
//
// Production: the key is provided as `GROQ_API_KEY` in the Vercel project
// environment variables (Settings -> Environment Variables).
//
// Local dev with the Vite dev server (`npm run dev`): a middleware in
// vite.config.ts serves the same `/api/chat` route and reads `GROQ_API_KEY`
// from the project `.env` file.
//
// IMPORTANT: Vercel compiles each `api/*.ts` entry in isolation and only ships
// compiled entries — it does NOT make local helper modules available at
// runtime. This file is therefore intentionally self-contained.
//
// This proxies Groq's streaming chat completions and re-streams deltas to the
// client as Server-Sent Events so the frontend can render text live.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const LIGHT_MODEL = "groq/compound-mini";

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

interface ProxyMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  model?: string;
  user: string;
  history?: { role: "user" | "assistant"; content: string }[];
  context: FinancialContext;
}

function fmt(n: number | undefined): string {
  return Number.isFinite(n) ? Number(n).toFixed(2) : "0.00";
}

function buildSystemPrompt(ctx?: FinancialContext): string {
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

function assembleMessages(opts: {
  context?: FinancialContext;
  history?: { role: "user" | "assistant"; content: string }[];
  user: string;
}): ProxyMessage[] {
  const messages: ProxyMessage[] = [
    { role: "system", content: buildSystemPrompt(opts.context) },
  ];
  if (Array.isArray(opts.history)) {
    for (const h of opts.history.slice(-6)) {
      if (
        h &&
        (h.role === "user" || h.role === "assistant") &&
        typeof h.content === "string" &&
        h.content
      ) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }
  messages.push({ role: "user", content: opts.user });
  return messages;
}

async function streamGroqChat(opts: {
  apiKey: string;
  model: string;
  messages: ProxyMessage[];
}): Promise<Response> {
  return fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
}

// Minimal SSE-friendly JSON stream parser over a fetch Response body.
async function* streamDeltas(
  upstream: Response
): AsyncGenerator<{ content?: string; done: boolean }> {
  if (!upstream.body) {
    yield { done: true };
    return;
  }
  const reader = upstream.body.getReader();
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
        if (!line.startsWith("data:")) continue;
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
  } finally {
    reader.releaseLock();
  }
}

// Call Groq, falling back to a lighter model once if the primary is
// unavailable. Returns the streaming Response or null when everything failed.
async function proxyToGroq(opts: {
  apiKey: string;
  model?: string;
  messages: ProxyMessage[];
}): Promise<{ res: Response | null; status: number }> {
  const model = opts.model || DEFAULT_MODEL;
  let upstream = await streamGroqChat({
    apiKey: opts.apiKey,
    model,
    messages: opts.messages,
  });

  if (!upstream.ok && upstream.status === 404 && model === DEFAULT_MODEL) {
    upstream = await streamGroqChat({
      apiKey: opts.apiKey,
      model: LIGHT_MODEL,
      messages: opts.messages,
    });
  }

  return { res: upstream.ok ? upstream : null, status: upstream.status };
}

async function pipeStream(upstream: Response, res: VercelResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    for await (const chunk of streamDeltas(upstream)) {
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

  const messages = assembleMessages({
    context: body.context,
    history: body.history,
    user,
  });

  try {
    const { res: upstream, status } = await proxyToGroq({
      apiKey,
      model: body.model || DEFAULT_MODEL,
      messages,
    });

    if (!upstream) {
      return res.status(status || 500).json({ error: "Groq request failed" });
    }

    return pipeStream(upstream, res);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Proxy error",
    });
  }
}