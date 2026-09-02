// Full-data memory file. The whole app state (profiles, expenses, chat history)
// is serialized to a single human-readable txt so that:
//   1. The AI butler always has full-history context (see buildContext in
//      src/lib/groq.ts), and
//   2. A copy lives in the repo as `data.txt` — available on GitHub for review.
//
// The browser cannot write files, so the client POSTs the dump to the local
// Vite dev-server route `/api/memory` (see vite.config.ts), which writes it to
// `data.txt` in the repo root. In production there is no such route, so the
// call is silently ignored.

import type { AppState } from "../store";
import type { Expense } from "../data";

export async function syncMemoryFile(dump: string): Promise<void> {
  try {
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: dump,
    });
    if (!res.ok && import.meta.env.DEV) {
      console.warn("Memory file sync failed:", res.status);
    }
  } catch {
    /* best effort — only exists in local dev */
  }
}

function money(amount: number, symbol: string): string {
  return `${symbol}${amount.toFixed(2)}`;
}

function expenseLine(e: Expense, symbols: Record<string, string>): string {
  const sym = symbols[e.currency] || "$";
  return `[${e.date} ${e.time}] ${e.label} — ${money(e.amount, sym)} | ${e.category} | ${e.member} | profile:${e.profileId}`;
}

export function serializeState(state: AppState): string {
  const symbols: Record<string, string> = {
    USD: "$",
    PHP: "₱",
    EUR: "€",
    GBP: "£",
  };
  const lines: string[] = [];

  lines.push("DOTSPEND — FULL DATA DUMP (machine-readable for AI review)");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    "Purpose: gives the financial-butler AI complete memory of past expenses, budgets, members, and prior conversations."
  );
  lines.push("");

  lines.push("## PROFILES");
  if (state.profiles.length === 0) {
    lines.push("(none)");
  } else {
    for (const p of state.profiles) {
      const sym = symbols[p.currency] || "$";
      const mine = state.expenses.filter((e) => e.profileId === p.id);
      const total = mine.reduce((s, e) => s + e.amount, 0);
      lines.push(
        `- name=${p.name} id=${p.id} color=${p.color} | daily budget=${money(p.dailyBudgetLimit, sym)} | currency=${p.currency}${mine.length ? ` | all-time spent=${money(total, sym)} across ${mine.length} expense(s)` : ""}`
      );
    }
  }
  lines.push("");

  lines.push("## EXPENSES (all time, oldest first)");
  const sortedExpenses = [...state.expenses].sort(
    (a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.id - b.id
  );
  if (sortedExpenses.length === 0) {
    lines.push("(none)");
  } else {
    for (const e of sortedExpenses) lines.push(expenseLine(e, symbols));
  }
  lines.push("");

  lines.push("## CHAT HISTORY (per profile, oldest first)");
  const profiles = state.profiles;
  if (profiles.length === 0) {
    lines.push("(none)");
  } else {
    for (const p of profiles) {
      lines.push(`### ${p.name} (${p.id})`);
      const msgs = state.messages
        .filter((m) => m.profileId === p.id)
        .sort((a, b) => a.id - b.id);
      if (msgs.length === 0) {
        lines.push("(no messages)");
      } else {
        for (const m of msgs) {
          lines.push(`[${m.date} ${m.time}] ${m.from === "ai" ? "AI" : "User"}: ${m.text}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}