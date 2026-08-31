import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, Expense } from "../data";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "../data";
import type { Profile } from "../store";

const SUGGESTIONS = [
  { text: "What can I eat for under $15?", accent: "#E9B380" },
  { text: "Show weekly trend", accent: "#CBE353" },
  { text: "Budget tips for today", accent: "#E9B380" },
  { text: "Biggest category today?", accent: "#CBE353" },
];

function generateAIResponse(
  question: string,
  expenses: Expense[],
  allExpenses: Expense[],
  profile: Profile,
  currency: string
): { text: string; isAlert: boolean } {
  const q = question.toLowerCase();
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, profile.dailyBudgetLimit - totalSpent);
  const pct = ((totalSpent / profile.dailyBudgetLimit) * 100).toFixed(0);

  // Category breakdown
  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const biggestCat = sortedCats[0];

  // Member breakdown
  const memberTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    memberTotals[e.member] = (memberTotals[e.member] || 0) + e.amount;
  });

  // Weekly trend
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const thisWeek = allExpenses
    .filter((e) => e.profileId === profile.id && e.date >= weekStr)
    .reduce((s, e) => s + e.amount, 0);
  const lastWeek = allExpenses
    .filter((e) => {
      const d = new Date(e.date);
      return e.profileId === profile.id && d >= weekAgo && d < now;
    })
    .reduce((s, e) => s + e.amount, 0);

  // Budget warnings
  if (pct && parseInt(pct) >= 90) {
    return {
      text: `Heads up! You've spent ${pct}% of your $${profile.dailyBudgetLimit} budget today. Only $${remaining.toFixed(2)} left. Maybe skip that extra purchase and save it for tomorrow?`,
      isAlert: true,
    };
  }

  if (q.includes("eat") || q.includes("food") || q.includes("meal") || q.includes("dinner") || q.includes("lunch")) {
    const foodSpent = catTotals["Food"] || 0;
    const foodBudget = profile.dailyBudgetLimit * 0.3;
    const foodLeft = Math.max(0, foodBudget - foodSpent);
    return {
      text: `You've spent $${foodSpent.toFixed(2)} on food so far today. With $${foodLeft.toFixed(2)} left in your food budget, here are some ideas:\n\n• Local deli sandwich: ~$8-12\n• Rice bowl spot: ~$10-14\n• Home cooking: ~$5-8\n\nWant me to find something specific in your area?`,
      isAlert: false,
    };
  }

  if (q.includes("weekly") || q.includes("trend") || q.includes("week")) {
    return {
      text: `Here's your weekly snapshot:\n\n• This week: $${thisWeek.toFixed(2)}\n• Budget: $${(profile.dailyBudgetLimit * 7).toFixed(0)}\n• Daily avg: $${(thisWeek / 7).toFixed(2)}\n\n${biggestCat ? `Your top category is ${biggestCat[0]} at $${biggestCat[1].toFixed(2)}.` : ""} ${remaining < 30 ? "You're running low today!" : "You're doing well so far."}`,
      isAlert: false,
    };
  }

  if (q.includes("tip") || q.includes("advice") || q.includes("suggest")) {
    return {
      text: `Here are some budget-friendly tips:\n\n1. Set a daily food limit of $${(profile.dailyBudgetLimit * 0.3).toFixed(0)} (30% of budget)\n2. Walk or use public transit instead of rideshare when possible\n3. Try the 24-hour rule: wait a day before non-essential purchases\n4. Track every expense — you're already doing great with that!\n\nYour remaining budget today is $${remaining.toFixed(2)}.`,
      isAlert: false,
    };
  }

  if (q.includes("biggest") || q.includes("most") || q.includes("top")) {
    if (biggestCat) {
      const pctOfTotal = totalSpent > 0 ? ((biggestCat[1] / totalSpent) * 100).toFixed(0) : "0";
      return {
        text: `Your biggest category today is ${biggestCat[0]} at $${biggestCat[1].toFixed(2)} (${pctOfTotal}% of total).\n\n${sortedCats.map(([cat, amt]) => `${CATEGORY_ICONS[cat] || "📦"} ${cat}: $${amt.toFixed(2)}`).join("\n")}`,
        isAlert: false,
      };
    }
    return { text: "No spending data yet today. Log your first expense to get started!", isAlert: false };
  }

  if (q.includes("who") || q.includes("spent") && q.includes("member")) {
    const entries = Object.entries(memberTotals).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      return {
        text: `Spending by person today:\n\n${entries.map(([name, amt]) => `• ${name}: $${amt.toFixed(2)}`).join("\n")}\n\n${entries[0][0]} spent the most at $${entries[0][1].toFixed(2)}.`,
        isAlert: false,
      };
    }
    return { text: "No spending data yet today.", isAlert: false };
  }

  // Default contextual response
  if (totalSpent === 0) {
    return {
      text: `Good morning! Your daily budget is $${profile.dailyBudgetLimit}. You haven't logged any expenses yet today. Ready to start tracking?`,
      isAlert: false,
    };
  }

  return {
    text: `Today you've spent $${totalSpent.toFixed(2)} (${pct}% of your $${profile.dailyBudgetLimit} budget). ${remaining > 0 ? `$${remaining.toFixed(2)} remaining.` : "You've hit your daily limit!"} ${biggestCat ? `Your top category is ${biggestCat[0]}.` : ""} What would you like to know?`,
    isAlert: parseInt(pct) >= 80,
  };
}

interface Props {
  messages: ChatMessage[];
  expenses: Expense[];
  allExpenses: Expense[];
  profile: Profile;
  currency: string;
  onSendMessage: (msg: ChatMessage) => void;
}

export default function AIButler({ messages, expenses, allExpenses, profile, currency, onSendMessage }: Props) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, profile.dailyBudgetLimit - totalSpent);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    (text?: string) => {
      const msgText = (text || input).trim();
      if (!msgText || isTyping) return;

      const timeStr = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const userMsg: ChatMessage = {
        id: Date.now(),
        from: "user",
        text: msgText,
        time: timeStr,
        date: new Date().toISOString().slice(0, 10),
        profileId: profile.id,
      };
      onSendMessage(userMsg);
      setInput("");
      setIsTyping(true);

      setTimeout(() => {
        const response = generateAIResponse(msgText, expenses, allExpenses, profile, currency);
        const aiMsg: ChatMessage = {
          id: Date.now() + 1,
          from: "ai",
          text: response.text,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          isAlert: response.isAlert,
          date: new Date().toISOString().slice(0, 10),
          profileId: profile.id,
        };
        onSendMessage(aiMsg);
        setIsTyping(false);
      }, 800);
    },
    [input, isTyping, expenses, allExpenses, profile, currency, onSendMessage]
  );

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ background: "#18181C", border: "1px solid #2A2A32" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 shrink-0" style={{ borderBottom: "1px solid #2A2A32" }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #612AD5, #9B6EFF)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">DotSpend AI</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80", boxShadow: "0 0 4px #4ADE80" }} />
            <span className="text-[10px] text-[#A1A1AA]">Context-aware · Online</span>
          </div>
        </div>
      </div>

      {/* Context summary */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div
          className="rounded-xl p-3"
          style={{ background: "rgba(97,42,213,0.1)", border: "1px solid rgba(97,42,213,0.22)" }}
        >
          <div className="text-[10px] text-[#A1A1AA] mb-2 uppercase tracking-wider">Context loaded</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="font-mono-data text-sm font-bold text-white">${totalSpent.toFixed(2)}</div>
              <div className="text-[9px] text-[#A1A1AA] mt-0.5">spent</div>
            </div>
            <div className="text-center border-x" style={{ borderColor: "#2A2A32" }}>
              <div className="font-mono-data text-sm font-bold" style={{ color: "#CBE353" }}>{expenses.length}</div>
              <div className="text-[9px] text-[#A1A1AA] mt-0.5">items</div>
            </div>
            <div className="text-center">
              <div className="font-mono-data text-sm font-bold" style={{ color: "#E9B380" }}>${remaining.toFixed(0)}</div>
              <div className="text-[9px] text-[#A1A1AA] mt-0.5">left</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-3 pb-2">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(97,42,213,0.2)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9B6EFF" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm" style={{ background: "#1E1E26", border: "1px solid #2A2A32" }}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-3 shrink-0">
        <div className="text-[10px] text-[#A1A1AA] mb-2 uppercase tracking-wider">Quick prompts</div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s.text)}
              disabled={isTyping}
              className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all duration-150 text-left disabled:opacity-50"
              style={{ background: `${s.accent}12`, color: s.accent, border: `1px solid ${s.accent}22` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${s.accent}22`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${s.accent}12`; }}
            >
              {s.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 shrink-0" style={{ borderTop: "1px solid #2A2A32" }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask your financial butler..."
            className="flex-1 text-sm outline-none placeholder:text-[#A1A1AA]"
            style={{ background: "transparent", border: "none", color: "white" }}
            disabled={isTyping}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150"
            style={{ background: input.trim() && !isTyping ? "#612AD5" : "#2A2A32" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.from === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed whitespace-pre-wrap"
          style={{ background: "linear-gradient(135deg, #612AD5, #7B42F5)" }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  if (message.isAlert) {
    return (
      <div className="flex gap-2 items-start">
        <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(233,179,128,0.18)" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E9B380" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div
          className="flex-1 px-3 py-2 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "rgba(233,179,128,0.08)", border: "1px solid rgba(233,179,128,0.2)", color: "#E9B380" }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(97,42,213,0.2)" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9B6EFF" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <div
        className="flex-1 px-3 py-2 rounded-2xl rounded-tl-sm text-sm text-white leading-relaxed whitespace-pre-wrap"
        style={{ background: "#1E1E26", border: "1px solid #2A2A32" }}
      >
        {message.text}
      </div>
    </div>
  );
}
