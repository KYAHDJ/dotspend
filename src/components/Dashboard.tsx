import { useState } from "react";
import type { Profile } from "../store";
import type { Expense, ChatMessage } from "../data";
import NavBar from "./NavBar";
import FinanceColumn from "./FinanceColumn";
import ExpenseColumn from "./ExpenseColumn";
import AIButler from "./AIButler";

interface Props {
  profile: Profile;
  currency: "USD" | "PHP";
  expenses: Expense[];
  allExpenses: Expense[];
  messages: ChatMessage[];
  onAddExpense: (expense: Expense) => void;
  onAddMessage: (msg: ChatMessage) => void;
  onCurrencyToggle: () => void;
  onOpenCalendar: () => void;
  onSwitchProfile: () => void;
  getWeekTotal: () => number;
  getMonthTotal: () => number;
  getExpensesForDate: (date: string) => Expense[];
  today: string;
}

export default function Dashboard({
  profile,
  currency,
  expenses,
  allExpenses,
  messages,
  onAddExpense,
  onAddMessage,
  onCurrencyToggle,
  onOpenCalendar,
  onSwitchProfile,
  getWeekTotal,
  getMonthTotal,
  getExpensesForDate,
  today,
}: Props) {
  const [mobileTab, setMobileTab] = useState<"overview" | "log" | "ai" | "history">("overview");

  return (
    <div
      className="flex flex-col bg-[#0F0F12]"
      style={{ height: "100%" }}
    >
      <NavBar
        profile={profile}
        currency={currency}
        onCurrencyToggle={onCurrencyToggle}
        onOpenCalendar={onOpenCalendar}
        onSwitchProfile={onSwitchProfile}
        today={today}
      />

      {/* Desktop 3-column */}
      <div className="flex-1 min-h-0 p-4 overflow-hidden hidden lg:block">
        <div
          className="h-full grid gap-4"
          style={{ gridTemplateColumns: "35fr 40fr 25fr" }}
        >
          <div className="min-h-0 overflow-y-auto">
            <FinanceColumn
              expenses={expenses}
              dailyBudget={profile.dailyBudgetLimit}
              getWeekTotal={getWeekTotal}
              getMonthTotal={getMonthTotal}
            />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <ExpenseColumn
              expenses={expenses}
              onAddExpense={onAddExpense}
              profile={profile}
            />
          </div>
          <div className="min-h-0 flex flex-col">
            <AIButler
              messages={messages}
              expenses={expenses}
              allExpenses={allExpenses}
              profile={profile}
              currency={currency}
              onSendMessage={onAddMessage}
            />
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex-1 min-h-0 overflow-hidden lg:hidden">
        {mobileTab === "overview" && (
          <div className="h-full overflow-y-auto p-4">
            <FinanceColumn
              expenses={expenses}
              dailyBudget={profile.dailyBudgetLimit}
              getWeekTotal={getWeekTotal}
              getMonthTotal={getMonthTotal}
            />
          </div>
        )}
        {mobileTab === "log" && (
          <div className="h-full overflow-y-auto p-4">
            <ExpenseColumn
              expenses={expenses}
              onAddExpense={onAddExpense}
              profile={profile}
            />
          </div>
        )}
        {mobileTab === "ai" && (
          <div className="h-full flex flex-col p-4">
            <AIButler
              messages={messages}
              expenses={expenses}
              allExpenses={allExpenses}
              profile={profile}
              currency={currency}
              onSendMessage={onAddMessage}
            />
          </div>
        )}
        {mobileTab === "history" && (
          <div className="h-full overflow-y-auto p-4">
            <div className="p-5 rounded-xl" style={{ background: "#18181C", border: "1px solid #2A2A32" }}>
              <h3 className="text-white font-semibold text-sm mb-4">Expense History</h3>
              <div className="space-y-2">
                {[...allExpenses].reverse().map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
                    <div>
                      <div className="text-sm text-white font-medium">{e.label}</div>
                      <div className="text-[11px] text-[#A1A1AA]">{e.date} · {e.time}</div>
                    </div>
                    <span className="font-mono-data text-sm font-semibold text-white">${e.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile tab bar */}
      <div
        className="lg:hidden shrink-0 flex items-center justify-around px-4 py-3"
        style={{ borderTop: "1px solid #2A2A32", background: "#18181C" }}
      >
        {[
          { key: "overview" as const, label: "Overview", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
          { key: "log" as const, label: "Log", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
          { key: "ai" as const, label: "AI Butler", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> },
          { key: "history" as const, label: "History", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setMobileTab(item.key)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors"
            style={{ color: mobileTab === item.key ? "#612AD5" : "#A1A1AA" }}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
