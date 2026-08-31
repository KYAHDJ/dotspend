import { useState } from "react";
import type { Expense } from "../data";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORIES } from "../data";
import type { Profile } from "../store";

interface Props {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  profile: Profile;
}

export default function ExpenseColumn({ expenses, onAddExpense, profile }: Props) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Food");
  const [location, setLocation] = useState("");
  const [member, setMember] = useState(profile.name);
  const [dragging, setDragging] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !amount) return;

    setSubmitting(true);
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    setTimeout(() => {
      const memberName = member.trim() || profile.name;
      onAddExpense({
        id: Date.now(),
        label: label.trim(),
        amount: parseFloat(amount),
        currency,
        category,
        time: timeStr,
        location: location.trim() || "Unknown",
        member: memberName,
        memberColor: profile.color,
        memberInitial: memberName[0].toUpperCase(),
        date: new Date().toISOString().slice(0, 10),
        profileId: profile.id,
      });
      setLabel("");
      setAmount("");
      setLocation("");
      setReceipt(null);
      setSubmitting(false);
    }, 400);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Add Form */}
      <div className="p-5 rounded-xl" style={{ background: "#18181C", border: "1px solid #2A2A32" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Log Expense</h3>
          <span className="text-[11px] px-2 py-1 rounded-full font-medium" style={{ background: "#612AD520", color: "#9B6EFF" }}>
            Quick Add
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What did you spend on?"
            className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all duration-200 placeholder:text-[#A1A1AA]"
            style={{ background: "#0F0F12", border: "1px solid #2A2A32", color: "white" }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#612AD5"; }}
            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#2A2A32"; }}
          />

          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-sm px-3 py-2.5 rounded-lg outline-none appearance-none cursor-pointer"
              style={{ background: "#0F0F12", border: "1px solid #2A2A32", color: "#CBE353", fontFamily: "'DM Mono', monospace", width: "80px" }}
            >
              <option value="USD">USD</option>
              <option value="PHP">PHP</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1 text-sm px-3 py-2.5 rounded-lg outline-none transition-all duration-200 placeholder:text-[#A1A1AA] font-mono-data"
              style={{ background: "#0F0F12", border: "1px solid #2A2A32", color: "white" }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#612AD5"; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#2A2A32"; }}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 text-sm px-3 py-2.5 rounded-lg outline-none cursor-pointer appearance-none"
              style={{ background: "#0F0F12", border: "1px solid #2A2A32", color: "white" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ background: "#18181C" }}>
                  {CATEGORY_ICONS[c]} {c}
                </option>
              ))}
            </select>

            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#A1A1AA" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full text-sm pl-8 pr-3 py-2.5 rounded-lg outline-none placeholder:text-[#A1A1AA] transition-all duration-200"
                style={{ background: "#0F0F12", border: "1px solid #2A2A32", color: "white" }}
                onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#612AD5"; }}
                onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#2A2A32"; }}
              />
            </div>
          </div>

          {/* Spent by */}
          <input
            type="text"
            value={member}
            onChange={(e) => setMember(e.target.value)}
            placeholder="Spent by (name)"
            className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all duration-200 placeholder:text-[#A1A1AA]"
            style={{ background: "#0F0F12", border: "1px solid #2A2A32", color: "white" }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#612AD5"; }}
            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "#2A2A32"; }}
          />

          {/* Receipt dropzone */}
          <div
            className="rounded-xl p-4 text-center cursor-pointer transition-all duration-200"
            style={{
              border: `2px dashed ${dragging ? "#612AD5" : "#2A2A32"}`,
              background: dragging ? "rgba(97,42,213,0.07)" : "transparent",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) setReceipt(file.name); }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*,.pdf";
              input.onchange = (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0];
                if (file) setReceipt(file.name);
              };
              input.click();
            }}
          >
            {receipt ? (
              <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: "#CBE353" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {receipt}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setReceipt(null); }}
                  className="ml-1 text-[#A1A1AA] hover:text-white"
                >
                  ×
                </button>
              </div>
            ) : (
              <div style={{ color: "#A1A1AA" }}>
                <svg className="mx-auto mb-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-xs">
                  Drop receipt or <span style={{ color: "#612AD5" }}>browse</span>
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!label.trim() || !amount || submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
            style={{
              background: label.trim() && amount && !submitting ? "#612AD5" : "#2A2A32",
              cursor: label.trim() && amount && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Log Expense
              </>
            )}
          </button>
        </form>
      </div>

      {/* Memory Feed */}
      <div className="p-5 rounded-xl" style={{ background: "#18181C", border: "1px solid #2A2A32" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">{"Today's Memory"}</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#CBE353" }} />
            <span className="font-mono-data text-xs text-[#A1A1AA]">{expenses.length} items</span>
          </div>
        </div>

        <div className="space-y-1">
          {[...expenses].reverse().map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} />
          ))}
          {expenses.length === 0 && (
            <div className="text-center py-6 text-[#A1A1AA] text-sm">
              No expenses logged yet today
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const color = CATEGORY_COLORS[expense.category] || "#A1A1AA";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150 cursor-pointer"
      style={{
        background: hovered ? "#1E1E26" : "transparent",
        border: `1px solid ${hovered ? "#2A2A32" : "transparent"}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: `${color}1A` }}>
        {CATEGORY_ICONS[expense.category] || "📦"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{expense.label}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-[#A1A1AA]">{expense.time}</span>
          <span style={{ color: "#2A2A32" }}>·</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-md" style={{ background: `${color}18`, color }}>
            {expense.location.split(",")[0]}
          </span>
          <span style={{ color: "#2A2A32" }}>·</span>
          <span className="text-[11px] text-[#A1A1AA]">{expense.member}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="font-mono-data text-sm font-semibold text-white">
          {expense.currency === "PHP" ? "₱" : "$"}{expense.amount.toFixed(2)}
        </span>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{ background: expense.memberColor }}
          title={expense.member}
        >
          {expense.memberInitial}
        </div>
      </div>
    </div>
  );
}
