import { useState, useMemo } from "react";
import type { Expense } from "../data";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "../data";

interface Props {
  onClose: () => void;
  expenses: Expense[];
  activeProfileId: string;
  dailyBudget: number;
  dailyTotals: Record<string, { total: number; status: "under" | "near" | "over" }>;
  getExpensesForDate: (date: string) => Expense[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS = {
  under: "#CBE353",
  near: "#E9B380",
  over: "#FF6B6B",
};

const STATUS_LABELS = {
  under: "Under budget",
  near: "Near limit",
  over: "Over budget",
};

export default function CalendarView({
  onClose,
  expenses,
  activeProfileId,
  dailyBudget,
  dailyTotals,
  getExpensesForDate,
}: Props) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayDate = now.getDate();

  const [selectedDate, setSelectedDate] = useState(todayDate);

  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
  const selectedData = dailyTotals[selectedDateStr];
  const selectedExpenses = getExpensesForDate(selectedDateStr);

  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-`;
    const monthExpenses = expenses.filter(
      (e) => e.profileId === activeProfileId && e.date.startsWith(monthPrefix)
    );
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const overDays = Object.entries(dailyTotals)
      .filter(([date, d]) => date.startsWith(monthPrefix) && d.status === "over").length;
    return { total, overDays, avgDaily: total / Math.max(todayDate, 1) };
  }, [expenses, activeProfileId, dailyTotals, currentYear, currentMonth, todayDate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-5xl flex rounded-2xl overflow-hidden"
        style={{ background: "#18181C", border: "1px solid #2A2A32", maxHeight: "90vh" }}
      >
        {/* Calendar panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white text-xl font-bold">{monthName}</h2>
              <p className="text-[#A1A1AA] text-xs mt-0.5">Spending history</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                {(Object.entries(STATUS_COLORS) as [keyof typeof STATUS_COLORS, string][]).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[11px] text-[#A1A1AA] capitalize">{status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xl text-[#A1A1AA] hover:text-white hover:bg-[#2A2A32] transition-all"
              >
                ×
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium py-2" style={{ color: "#A1A1AA" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="aspect-square" />;

              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const data = dailyTotals[dateStr];
              const isSelected = selectedDate === day;
              const isToday = day === todayDate;
              const dotColor = data ? STATUS_COLORS[data.status] : null;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 relative"
                  style={{
                    background: isSelected
                      ? "rgba(97,42,213,0.28)"
                      : isToday
                      ? "rgba(97,42,213,0.1)"
                      : "transparent",
                    border: isSelected
                      ? "1px solid #612AD5"
                      : isToday
                      ? "1px solid rgba(97,42,213,0.35)"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#1E1E26";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = isToday ? "rgba(97,42,213,0.1)" : "transparent";
                  }}
                >
                  <span
                    className="text-sm font-medium leading-none"
                    style={{ color: isSelected ? "white" : data ? "white" : "#6B7280" }}
                  >
                    {day}
                  </span>
                  {dotColor && <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />}
                </button>
              );
            })}
          </div>

          {/* Month summary */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Month Total", value: `$${monthStats.total.toFixed(0)}`, color: "white" },
              { label: "Over Budget Days", value: `${monthStats.overDays} days`, color: "#FF6B6B" },
              { label: "Avg Daily", value: `$${monthStats.avgDaily.toFixed(0)}`, color: "#CBE353" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
                <div className="text-[11px] text-[#A1A1AA]">{s.label}</div>
                <div className="font-mono-data text-base font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail drawer */}
        <div className="w-72 shrink-0 overflow-y-auto p-5" style={{ borderLeft: "1px solid #2A2A32" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-semibold">
                {now.toLocaleDateString("en-US", { month: "short" })} {selectedDate}
              </h3>
              <p className="text-[#A1A1AA] text-xs mt-0.5">
                {selectedDate === todayDate ? "Today" : "Day breakdown"}
              </p>
            </div>
            {selectedData && (
              <div
                className="px-2 py-1 rounded-lg text-[11px] font-medium"
                style={{
                  background: `${STATUS_COLORS[selectedData.status]}18`,
                  color: STATUS_COLORS[selectedData.status],
                }}
              >
                {STATUS_LABELS[selectedData.status]}
              </div>
            )}
          </div>

          {/* Total */}
          {selectedData ? (
            <div className="rounded-xl p-4 mb-4 text-center" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
              <div className="font-mono-data text-2xl font-bold text-white">${selectedData.total.toFixed(2)}</div>
              <div className="text-[#A1A1AA] text-xs mt-1">total spent</div>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "#2A2A32" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((selectedData.total / dailyBudget) * 100, 100)}%`,
                    background: STATUS_COLORS[selectedData.status],
                  }}
                />
              </div>
              <div className="text-[10px] text-[#A1A1AA] mt-1.5 font-mono-data">
                {((selectedData.total / dailyBudget) * 100).toFixed(1)}% of ${dailyBudget} budget
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 mb-4 text-center" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
              <div className="font-mono-data text-2xl font-bold text-white">$0.00</div>
              <div className="text-[#A1A1AA] text-xs mt-1">no expenses</div>
            </div>
          )}

          {/* Map preview */}
          <div className="rounded-xl mb-4 overflow-hidden" style={{ border: "1px solid #2A2A32" }}>
            <div
              className="h-24 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1a0f2e 0%, #0F0F12 100%)" }}
            >
              <div className="text-center">
                <svg className="mx-auto mb-1" style={{ color: "#612AD5" }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="text-[11px] text-[#A1A1AA]">Map Preview</div>
                <div className="text-[10px]" style={{ color: "#612AD5" }}>Location data</div>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div>
            <div className="text-[11px] text-[#A1A1AA] mb-3 uppercase tracking-wider">Transactions</div>
            {selectedExpenses.length > 0 ? (
              <div className="space-y-2">
                {selectedExpenses.map((expense) => (
                  <div key={expense.id} className="p-3 rounded-xl" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white font-medium truncate">{expense.label}</span>
                      <span className="font-mono-data text-sm text-white shrink-0">${expense.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-[#A1A1AA]">{expense.time}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{
                          background: `${CATEGORY_COLORS[expense.category] || "#6B7280"}18`,
                          color: CATEGORY_COLORS[expense.category] || "#6B7280",
                        }}
                      >
                        {expense.category}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA]">{expense.member}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl" style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}>
                <div className="text-[#A1A1AA] text-sm">
                  {selectedData ? `$${selectedData.total.toFixed(2)} logged` : "No expenses"}
                </div>
                <div className="text-xs text-[#A1A1AA] mt-1">
                  {selectedExpenses.length === 0 && selectedDate !== todayDate
                    ? "Past expenses are stored in history"
                    : "Log expenses to see them here"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
