import { useState, useRef, useEffect } from "react";
import type { Profile, Currency } from "../store";
import type { AppNotification } from "../data";
import { CURRENCY_SYMBOLS } from "../store";

const TYPE_COLORS: Record<string, string> = {
  budget: "#CBE353",
  expense: "#9B6EFF",
  insight: "#4ECDC4",
  alert: "#E9B380",
  custom: "#A1A1AA",
};

interface Props {
  profile: Profile;
  currency: Currency;
  activeNotifications: AppNotification[];
  unreadCount: number;
  onCurrencyToggle: () => void;
  onOpenCalendar: () => void;
  onSwitchProfile: () => void;
  onLogout: () => void;
  onChangePassword: (newPassword: string) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (id: string) => void;
  today: string;
}

export default function NavBar({
  profile,
  currency,
  activeNotifications,
  unreadCount,
  onCurrencyToggle,
  onOpenCalendar,
  onSwitchProfile,
  onLogout,
  onChangePassword,
  onMarkAllRead,
  onDeleteNotification,
  today,
}: Props) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const pwRef = useRef<HTMLDivElement>(null);

  const dateObj = new Date(today + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const closeAll = () => {
    setMenuOpen(false);
    setNotifOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        notifRef.current?.contains(target) ||
        pwRef.current?.contains(target)
      ) {
        return;
      }
      closeAll();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submitPassword = () => {
    if (!newPw) {
      setPwError("Enter a new password");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    onChangePassword(newPw);
    setShowEditPw(false);
    setNewPw("");
    setConfirmPw("");
    setPwError("");
  };

  const sym = CURRENCY_SYMBOLS[currency];

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

        {/* Currency toggle (per-profile) */}
        <button
          onClick={() => {
            onCurrencyToggle();
            closeAll();
          }}
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

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((o) => !o);
              setMenuOpen(false);
            }}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{ color: notifOpen ? "white" : "#A1A1AA", background: notifOpen ? "#18181C" : "transparent" }}
            onMouseEnter={(e) => {
              if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = "#18181C";
            }}
            onMouseLeave={(e) => {
              if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
            title="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: "#FF6B6B", color: "white" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: "#18181C", border: "1px solid #2A2A32" }}
            >
              <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #2A2A32" }}>
                <h3 className="text-white font-semibold text-sm">Notifications</h3>
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] text-[#9B6EFF] hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {activeNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#A1A1AA] text-sm">
                    No notifications yet
                  </div>
                ) : (
                  activeNotifications.map((n) => {
                    const color = TYPE_COLORS[n.type] || "#A1A1AA";
                    const time = new Date(n.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                    return (
                      <div
                        key={n.id}
                        className="px-4 py-3 transition-colors"
                        style={{
                          borderBottom: "1px solid #222228",
                          background: n.read ? "transparent" : `${color}0D`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ background: color, boxShadow: n.read ? "none" : `0 0 6px ${color}` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-white truncate">{n.title}</span>
                              <span className="text-[10px] text-[#A1A1AA] shrink-0">{time}</span>
                            </div>
                            <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                          <button
                            onClick={() => onDeleteNotification(n.id)}
                            className="text-[#A1A1AA] hover:text-[#FF6B6B] transition-colors shrink-0 mt-0.5"
                            title="Dismiss"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {activeNotifications.length > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="w-full py-2.5 text-xs font-medium transition-colors"
                  style={{ color: "#A1A1AA", borderTop: "1px solid #2A2A32" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "white")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA")}
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen((o) => !o);
              setNotifOpen(false);
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all duration-150"
            style={{ background: `linear-gradient(135deg, ${profile.color}, ${profile.color}CC)` }}
            title={profile.name}
          >
            {profile.initial}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-11 w-52 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: "#18181C", border: "1px solid #2A2A32" }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #2A2A32" }}>
                <div className="text-sm font-semibold text-white truncate">{profile.name}</div>
                <div className="text-[11px] text-[#A1A1AA] mt-0.5 flex items-center gap-1">
                  <span className="font-mono-data">{sym}</span>
                  <span>{profile.dailyBudgetLimit}/day · {currency}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditPw(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#D9D9DE] hover:text-white hover:bg-[#222228] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Edit Password
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onSwitchProfile();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#D9D9DE] hover:text-white hover:bg-[#222228] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Switch Profile
              </button>
              <div style={{ borderTop: "1px solid #2A2A32" }}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#FF6B6B] hover:bg-[#FF6B6B14] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Password modal */}
      {showEditPw && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowEditPw(false)}
        >
          <div
            ref={pwRef}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#18181C", border: "1px solid #2A2A32" }}
          >
            <h3 className="text-white font-semibold text-lg mb-1">Change Password</h3>
            <p className="text-[#A1A1AA] text-xs mb-4">
              Set a new password for {profile.name}
            </p>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="New password"
              autoFocus
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none text-white placeholder:text-[#A1A1AA] mb-2.5"
              style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
            />
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="Confirm new password"
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none text-white placeholder:text-[#A1A1AA] mb-3"
              style={{ background: "#0F0F12", border: "1px solid #2A2A32" }}
            />
            {pwError && <p className="text-[#FF6B6B] text-xs mb-3">{pwError}</p>}
            <div className="flex gap-2">
              <button
                onClick={submitPassword}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#612AD5" }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditPw(false);
                  setNewPw("");
                  setConfirmPw("");
                  setPwError("");
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "#2A2A32", color: "#A1A1AA" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
