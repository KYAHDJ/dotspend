// Shared server-side Groq proxy logic. Used by the Vercel serverless function
// (api/chat.ts) and the Vite dev-server middleware (vite.config.ts). This module
// must only ever run in a Node/server context — never import it from client
// code. The API key is always passed in as a parameter and never bundled.

export interface FinancialContext {
  profileName: string;
  dailyBudget: number;
  spentToday: number;
  remaining: number;
  itemsToday: number;
  weekTotal: number;
  monthTotal: number;
  expensesToday: Array<{ label: string; amount: number; category: string }>;
}

export interface ProxyMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const LIGHT_MODEL = "llama3-8b-8192";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function fmt(n: number | undefined): string {
  return Number.isFinite(n) ? Number(n).toFixed(2) : "0.00";
}

export function buildSystemPrompt(ctx?: FinancialContext): string {
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

export function assembleMessages(opts: {
  context?: FinancialContext;
  history?: ProxyMessage[];
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

export async function streamGroqChat(opts: {
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

/**
 * Minimal SSE-friendly parser that yields the delta content of each Groq
 * streaming chunk. Falls back to the lighter model when the primary model
 * returns a 404 (unavailable), and passes the fallback stream through.
 */
export async function* streamDeltas(
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

/**
 * Call Groq with a model fallback chain. Returns the (possibly retried)
 * streaming Response, or null when everything failed.
 */
export async function proxyToGroq(opts: {
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