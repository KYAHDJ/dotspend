import { useState } from "react";
import type { Expense } from "../data";
import { CATEGORY_COLORS } from "../data";

function donutSlicePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  a1: number,
  a2: number
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + outerR * Math.cos(toRad(a1));
  const y1 = cy + outerR * Math.sin(toRad(a1));
  const x2 = cx + outerR * Math.cos(toRad(a2));
  const y2 = cy + outerR * Math.sin(toRad(a2));
  const x3 = cx + innerR * Math.cos(toRad(a2));
  const y3 = cy + innerR * Math.sin(toRad(a2));
  const x4 = cx + innerR * Math.cos(toRad(a1));
  const y4 = cy + innerR * Math.sin(toRad(a1));
  const large = a2 - a1 > 180 ? 1 : 0;
  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
    `L ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
  );
}

function BudgetRing({ spent, total }: { spent: number; total: number }) {
  const r = 60;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(spent / total, 1);
  const offset = circumference * (1 - pct);
  const ringColor = pct >= 1 ? "#FF6B6B" : pct >= 0.8 ? "#E9B380" : "#CBE353";

  return (
    <div className="relative flex items-center justify-center w-36 h-36 shrink-0">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#2A2A32" strokeWidth="9" />
        <circle
          cx="72" cy="72" r={r} fill="none" stroke={ringColor} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono-data text-2xl font-bold text-white leading-none">
          ${spent.toFixed(0)}
        </div>
        <div className="text-[10px] text-[#A1A1AA] mt-1">of ${total}</div>
        <div
          className="text-[10px] font-medium mt-1.5 px-2 py-0.5 rounded-full font-mono-data"
          style={{ background: `${ringColor}20`, color: ringColor }}
        >
          {(pct * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

interface Props {
  expenses: Expense[];
  dailyBudget: number;
  getWeekTotal: () => number;
  getMonthTotal: () => number;
}

export default function FinanceColumn({ expenses, dailyBudget, getWeekTotal, getMonthTotal }: Props) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const grandTotal = Object.values(catTotals).reduce((a, b) => a + b, 0);

  const cats = Object.entries(catTotals);
  const GAP = 3;
  const totalGap = GAP * cats.length;
  const totalSweep = 360 - totalGap;

  let currentAngle = 0;
  const segments = cats.map(([cat, val]) => {
    const pct = grandTotal > 0 ? val / grandTotal : 0;
    const sweep = pct * totalSweep;
    const seg = {
      cat, val, pct,
      color: CATEGORY_COLORS[cat] || "#6B7280",
      startAngle: currentAngle,
      endAngle: currentAngle + sweep,
    };
    currentAngle += sweep + GAP;
    return seg;
  });

  const CX = 100, CY = 100, INNER_R = 52, OUTER_R = 88;
  const budgetPct = dailyBudget > 0 ? totalSpent / dailyBudget : 0;
  const budgetBarColor = budgetPct >= 1 ? "#FF6B6B" : budgetPct >= 0.8 ? "#E9B380" : "#CBE353";

  const weekTotal = getWeekTotal();
  const monthTotal = getMonthTotal();
  const avgDaily = monthTotal / Math.max(new Date().getDate(), 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Daily Budget Card */}
      <div className="p-5 rounded-xl" style={{ background: "#18181C", border: "1px solid #2A2A32" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Daily Budget</h3>
            <p className="text-[#A1A1AA] text-xs mt-0.5">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{
              background: budgetPct >= 1 ? "#FF6B6B22" : budgetPct >= 0.8 ? "#E9B38022" : "#CBE35322",
              color: budgetBarColor,
            }}
          >
            {budgetPct >= 1 ? "Over" : budgetPct >= 0.8 ? "Warning" : "Active"}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <BudgetRing spent={totalSpent} total={dailyBudget} />
          <div className="flex-1 space-y-3">
            <div>
              <div className="text-[11px] text-[#A1A1AA] mb-0.5">Spent Today</div>
              <div className="font-mono-data text-xl font-bold text-white">${totalSpent.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#A1A1AA] mb-0.5">Remaining</div>
              <div className="font-mono-data text-base font-semibold" style={{ color: budgetBarColor }}>
                ${Math.max(0, dailyBudget - totalSpent).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#A1A1AA] mb-0.5">Limit</div>
              <div className="font-mono-data text-sm text-white">${dailyBudget.toFixed(0)} / day</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-[#A1A1AA] mb-1.5">
            <span>Budget utilization</span>
            <span className="font-mono-data">{(budgetPct * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2A2A32" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(budgetPct * 100, 100)}%`,
                background: budgetBarColor,
              }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "This Week", value: `$${weekTotal.toFixed(0)}` },
            { label: "This Month", value: `$${monthTotal.toFixed(0)}` },
            { label: "Avg Daily", value: `$${avgDaily.toFixed(0)}` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ background: "#0F0F12" }}>
              <div className="font-mono-data text-sm font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-[#A1A1AA] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Breakdown Donut */}
      <div className="p-5 rounded-xl" style={{ background: "#18181C", border: "1px solid #2A2A32" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Spending Breakdown</h3>
          <span className="font-mono-data text-xs text-[#A1A1AA]">Today</span>
        </div>

        <div className="flex justify-center mb-3">
          {cats.length > 0 ? (
            <svg width="200" height="200" viewBox="0 0 200 200">
              {segments.map((seg) => (
                <path
                  key={seg.cat}
                  d={donutSlicePath(CX, CY, INNER_R, OUTER_R, seg.startAngle, seg.endAngle)}
                  fill={seg.color}
                  style={{
                    opacity: hoveredCat === null || hoveredCat === seg.cat ? 1 : 0.25,
                    transition: "opacity 0.2s ease",
                    cursor: "pointer",
                    filter: hoveredCat === seg.cat ? `drop-shadow(0 0 10px ${seg.color}99)` : "none",
                  }}
                  onMouseEnter={() => setHoveredCat(seg.cat)}
                  onMouseLeave={() => setHoveredCat(null)}
                />
              ))}
              <text x={CX} y={CY - 8} textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="'DM Mono', monospace">
                ${grandTotal.toFixed(0)}
              </text>
              <text x={CX} y={CY + 10} textAnchor="middle" fill="#A1A1AA" fontSize="11" fontFamily="'Inter', sans-serif">
                total today
              </text>
              {hoveredCat && catTotals[hoveredCat] !== undefined && (
                <text x={CX} y={CY + 28} textAnchor="middle" fill={CATEGORY_COLORS[hoveredCat] || "#A1A1AA"} fontSize="10" fontFamily="'Inter', sans-serif">
                  {hoveredCat}
                </text>
              )}
            </svg>
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center text-[#A1A1AA] text-sm">
              No expenses yet
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          {segments.map((seg) => (
            <div
              key={seg.cat}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-all duration-150 cursor-pointer"
              style={{ background: hoveredCat === seg.cat ? `${seg.color}15` : "transparent" }}
              onMouseEnter={() => setHoveredCat(seg.cat)}
              onMouseLeave={() => setHoveredCat(null)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="text-[13px] text-[#A1A1AA]">{seg.cat}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono-data text-[11px] text-[#A1A1AA]">{(seg.pct * 100).toFixed(1)}%</span>
                <span className="font-mono-data text-sm font-medium text-white w-14 text-right">${seg.val.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
