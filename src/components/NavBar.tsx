import { useState } from "react";
import type { Profile } from "../store";

interface Props {
  profile: Profile;
  currency: "USD" | "PHP";
  onCurrencyToggle: () => void;
  onOpenCalendar: () => void;
  onSwitchProfile: () => void;
  today: string;
}

export default function NavBar({
  profile,
  currency,
  onCurrencyToggle,
  onOpenCalendar,
  onSwitchProfile,
  today,
}: Props) {
  const [search, setSearch] = useState("");

  const dateObj = new Date(today + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <nav
      className="flex items-center gap-3 px-5 py-3 shrink-0"
      style={{ borderBottom: "1px solid #2A2A32", background: "#0F0F12" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #612AD5, #9B6EFF)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L4 8v13h5v-7h6v7h5V8L12 3z" fill="white" />
          </svg>
        </div>
        <span className="text-white font-bold text-base tracking-tight hidden sm:block">
          Dot<span style={{ color: "#612AD5" }}>Spend</span>
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "#A1A1AA" }}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search expenses..."
          className="w-full text-sm pl-8 pr-3 py-2 rounded-lg outline-none transition-all duration-200 placeholder:text-[#A1A1AA]"
          style={{
            background: "#18181C",
            border: "1px solid #2A2A32",
            color: "white",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "#612AD5";
            (e.currentTarget as HTMLInputElement).style.boxShadow =
              "0 0 0 3px rgba(97,42,213,0.15)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLInputElement).style.borderColor = "#2A2A32";
            (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
          }}
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: "#A1A1AA" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#18181C";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="hidden md:inline">History</span>
        </button>

        <button
          onClick={onCurrencyToggle}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 font-mono-data"
          style={{
            border: "1px solid rgba(203,227,83,0.3)",
            color: "#CBE353",
            background: "rgba(203,227,83,0.08)",
          }}
        >
          {currency}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
          </svg>
        </button>

        <div
          className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
          style={{ border: "1px solid #2A2A32", color: "#A1A1AA" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {dateLabel}
        </div>

        <button
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ color: "#A1A1AA" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#18181C";
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "#CBE353" }} />
        </button>

        <button
          onClick={onSwitchProfile}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all duration-150"
          style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}CC)` }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px ${profile.color}, 0 0 0 4px ${profile.color}44`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          {profile.initial}
        </button>
      </div>
    </nav>
  );
}
