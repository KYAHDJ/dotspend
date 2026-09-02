import type { Expense } from "../data";
import type { Profile } from "../store";
import { CURRENCY_SYMBOLS } from "../store";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface GroqContext {
  profileName: string;
  dailyBudget: number;
  spentToday: number;
  remaining: number;
  itemsToday: number;
  weekTotal: number;
  monthTotal: number;
  currency: string;
  currencySymbol: string;
  allTimeTotal: number;
  topExpense: { label: string; amount: number; date: string } | null;
  recentDays: { date: string; total: number; count: number }[];
  expensesToday: Array<{ label: string; amount: number; category: string }>;
}

// Base URL of the serverless proxy. Overridable for local dev / tests via
// VITE_GROQ_URL. The Groq API key lives ONLY on the server.
const PROXY_URL =
  (import.meta.env.VITE_GROQ_URL as string | undefined) || "/api/chat";

/**
 * Compute the structured financial context sent to the serverless proxy, which
 * turns it into a "Financial Butler" system prompt server-side.
 */
export function buildContext(
  profile: Profile,
  expensesToday: Expense[],
  allExpenses: Expense[]
): GroqContext {
  const spentToday = expensesToday.reduce((s, e) => s + e.amount, 0);
  const remaining = profile.dailyBudgetLimit - spentToday;

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7); // YYYY-MM

  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const weekStr = thisWeekStart.toISOString().slice(0, 10);

  const weekTotal = allExpenses
    .filter((e) => e.profileId === profile.id && e.date >= weekStr)
    .reduce((s, e) => s + e.amount, 0);

  const monthTotal = allExpenses
    .filter((e) => e.profileId === profile.id && e.date.startsWith(monthStr))
    .reduce((s, e) => s + e.amount, 0);

  const mine = allExpenses.filter((e) => e.profileId === profile.id);
  const allTimeTotal = mine.reduce((s, e) => s + e.amount, 0);

  let topExpense: { label: string; amount: number; date: string } | null = null;
  for (const e of mine) {
    if (!topExpense || e.amount > topExpense.amount) {
      topExpense = { label: e.label, amount: e.amount, date: e.date };
    }
  }

  // Last 14 days, one daily summary per day so the AI can answer questions
  // about "yesterday", "this week", or "most expensive" from memory.
  const byDay = new Map<string, { total: number; count: number }>();
  for (const e of mine) {
    const cur = byDay.get(e.date) || { total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    byDay.set(e.date, cur);
  }
  const recentDays: { date: string; total: number; count: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const agg = byDay.get(key);
    if (agg) recentDays.push({ date: key, total: agg.total, count: agg.count });
  }

  const currencySymbol = CURRENCY_SYMBOLS[profile.currency] || "$";

  return {
    profileName: profile.name,
    dailyBudget: profile.dailyBudgetLimit,
    spentToday,
    remaining,
    itemsToday: expensesToday.length,
    weekTotal,
    monthTotal,
    currency: profile.currency,
    currencySymbol,
    allTimeTotal,
    topExpense,
    recentDays,
    expensesToday: expensesToday
      .slice(-12)
      .map((e) => ({
        label: e.label,
        amount: e.amount,
        category: e.category,
      })),
  };
}

/**
 * Call the Groq proxy with streaming enabled and invoke `onChunk` for each
 * token delta as it arrives. e.g.:
 *
 *   const full = await streamChat({
 *     user, context, history,
 *     onChunk: (c) => setText((t) => t + c),
 *   });
 */
export async function streamChat(opts: {
  user: string;
  context: GroqContext;
  history?: ChatHistoryItem[];
  model?: string;
  onChunk?: (delta: string) => void;
}): Promise<{ text: string; ok: boolean; error?: string }> {
  const { user, context, history, model, onChunk } = opts;

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user,
      context,
      history: history || [],
      model: model,
    }),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = typeof data?.error === "string" ? data.error : message;
    } catch {
      /* ignore */
    }
    return { text: "", ok: false, error: message };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!res.body) {
    return { text: "", ok: false, error: "No response body" };
  }

  // Non-streaming fallback (e.g., some proxies return plain JSON).
  if (!contentType.includes("text/event-stream")) {
    const data = await res.json();
    const text =
      typeof data?.content === "string"
        ? data.content
        : typeof data?.text === "string"
        ? data.text
        : "";
    onChunk?.(text);
    return { text, ok: !!text };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";

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
          return { text: acc, ok: true };
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed?.content;
          if (typeof content === "string" && content) {
            acc += content;
            onChunk?.(content);
          }
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { text: acc, ok: acc.length > 0 };
}
