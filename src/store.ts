import { useState, useCallback, useEffect, useRef } from "react";
import type { Expense, ChatMessage, AppNotification } from "./data";
import {
  loadProfiles,
  saveProfile,
  deleteProfile as deleteProfileDB,
  loadExpenses,
  saveExpense,
  deleteExpense as deleteExpenseDB,
  loadMessages,
  saveMessage,
  loadNotifications,
  saveNotification,
  deleteNotification as deleteNotificationDB,
  clearDB,
} from "./firestore";
import { isFirebaseConfigured } from "./firebase";

export type Currency = "USD" | "PHP";

export interface PasswordHash {
  salt: string;
  hash: string;
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  initial: string;
  dailyBudgetLimit: number;
  currency: Currency;
  // Hashed password: { salt, hash }. Kept backward-compatible with legacy
  // plaintext strings for profiles created before hashing was introduced.
  password?: string | PasswordHash;
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string;
  expenses: Expense[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  currency: Currency;
}

const STORAGE_KEY = "dotspend_state";
const AUTHED_KEY = "dotspend_authed_profiles";
const VERSION_KEY = "dotspend_state_version";
const STATE_VERSION = 3;
const TODAY = new Date().toISOString().slice(0, 10);

// Master admin password used to delete any profile.
export const ADMIN_PASSWORD =
  import.meta.env.VITE_ADMIN_PASSWORD || "dotspend-admin";

// Default Admin account seeded on first launch.
export const DEFAULT_ADMIN_PASSWORD = "19621960";
export const DEFAULT_ADMIN_COLOR = "#612AD5";

// Currency symbols used for dynamic formatting across the dashboard.
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  PHP: "₱",
};

export function formatMoney(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  return `${symbol}${amount.toFixed(2)}`;
}

// ── Password hashing (Web Crypto SHA-256 with per-profile salt) ──
function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(
  password: string,
  salt?: string
): Promise<PasswordHash> {
  const s = salt || randomSalt();
  const data = new TextEncoder().encode(s + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return { salt: s, hash };
}

async function verifyPassword(
  password: string | PasswordHash | undefined,
  candidate: string
): Promise<boolean> {
  if (!password) return true;
  if (typeof password === "string") {
    // Legacy plaintext password.
    return candidate === password;
  }
  const hash = await hashPassword(candidate, password.salt);
  return hash.hash === password.hash;
}

function getLocalState(): AppState | null {
  try {
    // Fresh start: if a version bump is detected, clear old seeded data.
    const version = localStorage.getItem(VERSION_KEY);
    if (version !== String(STATE_VERSION)) {
      // Migration: keep the user's profiles/expenses but drop the now-unused
      // legacy seed path. Preserve state across the currency/password upgrade.
      localStorage.setItem(VERSION_KEY, String(STATE_VERSION));
      // Re-read below — the same payload is compatible as long as profiles exist.
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.profiles && parsed.expenses) {
        const profiles: Profile[] = parsed.profiles.map((p) => ({
          ...p,
          currency: p.currency === "PHP" ? ("PHP" as Currency) : ("USD" as Currency),
        }));
        const notifications = Array.isArray(parsed.notifications)
          ? parsed.notifications
          : [];
        const activeProfile = profiles.find(
          (p) => p.id === parsed.activeProfileId
        );
        const activeCurrency: Currency =
          activeProfile?.currency && activeProfile.currency in CURRENCY_SYMBOLS
            ? (activeProfile.currency as Currency)
            : parsed.currency === "PHP"
            ? "PHP"
            : "USD";
        return {
          ...parsed,
          profiles,
          notifications,
          currency: activeCurrency,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

function saveLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(VERSION_KEY, String(STATE_VERSION));
  } catch { /* ignore */ }
}

function loadAuthed(): string[] {
  try {
    const raw = localStorage.getItem(AUTHED_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

function saveAuthed(ids: string[]) {
  try {
    localStorage.setItem(AUTHED_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// Detect a fresh-start (version bump) once at module scope, so we can both
// wipe Firestore and reset localStorage consistently on first render.
const IS_VERSION_MISMATCH = (() => {
  try {
    return localStorage.getItem(VERSION_KEY) !== String(STATE_VERSION);
  } catch {
    return false;
  }
})();

function getDefaultState(): AppState {
  return {
    profiles: [],
    activeProfileId: "",
    expenses: [],
    messages: [],
    notifications: [],
    currency: "USD",
  };
}

export function useStore() {
  const [state, setState] = useState<AppState>(
    getLocalState() || getDefaultState()
  );
  const [loading, setLoading] = useState(true);
  const [authedProfiles, setAuthedProfiles] = useState<string[]>(loadAuthed);
  const adminSeededRef = useRef(false);

  // Load from Firestore on mount with timeout
  useEffect(() => {
    let cancelled = false;

    function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);
    }

    (async () => {
      try {
        if (IS_VERSION_MISMATCH) {
          // Do a best-effort clear so old default profiles don't reappear.
          withTimeout(clearDB(), 6000, undefined).catch(() => {});
        }

        if (!isFirebaseConfigured) {
          if (!cancelled) setLoading(false);
          return;
        }

        const timeout = 5000;
        const [profiles, expenses, messages, notifications] = await Promise.all([
          withTimeout(loadProfiles(), timeout, []),
          withTimeout(loadExpenses(), timeout, []),
          withTimeout(loadMessages(), timeout, []),
          withTimeout(loadNotifications(), timeout, []),
        ]);

        if (cancelled) return;

        const hasLocal =
          state.profiles.length > 0 ||
          state.expenses.length > 0 ||
          state.messages.length > 0;

        if (profiles.length === 0 && expenses.length === 0 && hasLocal) {
          state.profiles.forEach((p) => saveProfile(p).catch(console.warn));
          state.expenses.forEach((e) => saveExpense(e).catch(console.warn));
          state.messages.forEach((m) => saveMessage(m).catch(console.warn));
          state.notifications.forEach((n) => saveNotification(n).catch(console.warn));
          if (!cancelled) setLoading(false);
          return;
        }

        const activeProfile = profiles.find(
          (p) => p.id === state.activeProfileId
        );
        setState({
          profiles,
          activeProfileId: activeProfile?.id || state.activeProfileId || profiles[0]?.id || "",
          expenses,
          messages,
          notifications,
          currency: activeProfile?.currency || profiles[0]?.currency || "USD",
        });
      } catch (err) {
        console.warn("Firestore unavailable, using local data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const persistAuthed = useCallback((ids: string[]) => {
    setAuthedProfiles(ids);
    saveAuthed(ids);
  }, []);

  // Persist to both localStorage and Firestore on state change
  useEffect(() => {
    if (loading) return;
    saveLocal(state);
  }, [state, loading]);

  const activeProfile =
    state.profiles.find((p) => p.id === state.activeProfileId) ||
    state.profiles[0];

  // Per-profile currency: derive from the active profile so switching profiles
  // never bleeds one profile's currency setting into another.
  const currency: Currency =
    activeProfile?.currency || state.currency || "USD";

  const todayExpenses = state.expenses.filter(
    (e) => e.date === TODAY && e.profileId === state.activeProfileId
  );

  const activeNotifications = state.notifications
    .filter((n) => n.profileId === state.activeProfileId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const unreadCount = activeNotifications.filter((n) => !n.read).length;

  const isProfileAuthed = useCallback(
    (id: string) => authedProfiles.includes(id),
    [authedProfiles]
  );

  const verifyProfilePassword = useCallback(
    async (id: string, password: string): Promise<boolean> => {
      const profile = state.profiles.find((p) => p.id === id);
      if (!profile) return false;
      const ok = await verifyPassword(profile.password, password);
      if (ok) {
        persistAuthed([...new Set([...authedProfiles, id])]);
        return true;
      }
      return false;
    },
    [state.profiles, authedProfiles, persistAuthed]
  );

  const setActiveProfile = useCallback((id: string) => {
    setState((s) => {
      const profile = s.profiles.find((p) => p.id === id);
      const newState: AppState = {
        ...s,
        activeProfileId: id,
        currency: profile?.currency || s.currency,
      };
      saveLocal(newState);
      return newState;
    });
  }, []);

  // Sets only the ACTIVE profile's currency (isolated per profile).
  const setCurrency = useCallback((c: Currency) => {
    setState((s) => {
      if (!s.activeProfileId) return s;
      const newState: AppState = {
        ...s,
        currency: c,
        profiles: s.profiles.map((p) =>
          p.id === s.activeProfileId ? { ...p, currency: c } : p
        ),
      };
      saveLocal(newState);
      return newState;
    });
    const active = state.profiles.find((p) => p.id === state.activeProfileId);
    if (active) {
      saveProfile({ ...active, currency: c }).catch(console.warn);
    }
  }, [state.profiles, state.activeProfileId]);

  const changePassword = useCallback(
    async (profileId: string, newPassword: string) => {
      const hashed = await hashPassword(newPassword);
      const updates: Partial<Profile> = { password: hashed };
      setState((s) => {
        const newState: AppState = {
          ...s,
          profiles: s.profiles.map((p) =>
            p.id === profileId ? { ...p, ...updates } : p
          ),
        };
        saveLocal(newState);
        return newState;
      });
      const profile = state.profiles.find((p) => p.id === profileId);
      if (profile) saveProfile({ ...profile, ...updates }).catch(console.warn);
    },
    [state.profiles]
  );

  // Log out the current profile: clear its auth and reset to profile screen.
  const logout = useCallback(() => {
    const id = state.activeProfileId;
    setState((s) => ({
      ...s,
      activeProfileId: "",
    }));
    if (id) {
      persistAuthed(authedProfiles.filter((pid) => pid !== id));
    }
  }, [state.activeProfileId, authedProfiles, persistAuthed]);

  const addExpense = useCallback((expense: Expense) => {
    const full: Expense = { ...expense, date: TODAY, profileId: state.activeProfileId, currency: currency };
    setState((s) => {
      const newState: AppState = { ...s, expenses: [...s.expenses, full] };
      saveLocal(newState);
      return newState;
    });
    saveExpense(full).catch(console.warn);
  }, [state.activeProfileId, currency]);

  const deleteExpense = useCallback((id: number) => {
    setState((s) => {
      const newState: AppState = { ...s, expenses: s.expenses.filter((e) => e.id !== id) };
      saveLocal(newState);
      return newState;
    });
    deleteExpenseDB(id).catch(console.warn);
  }, []);

  const updateExpense = useCallback((id: number, updates: Partial<Expense>) => {
    setState((s) => {
      const newState: AppState = {
        ...s,
        expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      };
      saveLocal(newState);
      return newState;
    });
    const expense = state.expenses.find((e) => e.id === id);
    if (expense) saveExpense({ ...expense, ...updates }).catch(console.warn);
  }, [state.expenses]);

  const addMessage = useCallback((msg: ChatMessage) => {
    const full: ChatMessage = { ...msg, date: TODAY, profileId: state.activeProfileId };
    setState((s) => {
      const newState: AppState = { ...s, messages: [...s.messages, full] };
      saveLocal(newState);
      return newState;
    });
    saveMessage(full).catch(console.warn);
  }, [state.activeProfileId]);

  const addProfile = useCallback(
    async (name: string, color: string, password?: string): Promise<string> => {
      const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
      const newProfile: Profile = {
        id,
        name,
        color,
        initial: name[0].toUpperCase(),
        dailyBudgetLimit: 150,
        currency: "USD",
        password: password
          ? await hashPassword(password)
          : undefined,
      };
      setState((s) => {
        const newState: AppState = { ...s, profiles: [...s.profiles, newProfile] };
        saveLocal(newState);
        return newState;
      });
      saveProfile(newProfile).catch(console.warn);
      return id;
    },
    []
  );

  // Seed a default Admin profile (with the fixed, hashed password) on first
  // launch when no profiles exist yet.
  useEffect(() => {
    if (loading || adminSeededRef.current) return;
    if (state.profiles.length > 0) {
      adminSeededRef.current = true;
      return;
    }
    const hasPendingAdmin = state.profiles.some((p) => p.name === "Admin");
    if (hasPendingAdmin) {
      adminSeededRef.current = true;
      return;
    }
    adminSeededRef.current = true;
    addProfile("Admin", DEFAULT_ADMIN_COLOR, DEFAULT_ADMIN_PASSWORD).catch(
      console.warn
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, state.profiles.length]);

  const updateProfile = useCallback(
    async (id: string, updates: Partial<Profile>) => {
      let finalUpdates = updates;
      if (updates.password === undefined || updates.password === "") {
        // Clearing the password removes it entirely.
        finalUpdates = { ...updates };
        delete finalUpdates.password;
      } else if (typeof updates.password === "string") {
        // Hash any plaintext password before persisting.
        finalUpdates = {
          ...updates,
          password: await hashPassword(updates.password as string),
        };
      }
      setState((s) => {
        const newState: AppState = {
          ...s,
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...finalUpdates } : p
          ),
        };
        saveLocal(newState);
        return newState;
      });
      const profile = state.profiles.find((p) => p.id === id);
      if (profile) saveProfile({ ...profile, ...finalUpdates }).catch(console.warn);
    },
    [state.profiles]
  );

  const deleteProfileFn = useCallback((id: string) => {
    setState((s) => {
      const remaining = s.profiles.filter((p) => p.id !== id);
      if (remaining.length === 0) return s;
      const newState: AppState = {
        ...s,
        profiles: remaining,
        activeProfileId: s.activeProfileId === id ? remaining[0].id : s.activeProfileId,
        expenses: s.expenses.filter((e) => e.profileId !== id),
        messages: s.messages.filter((m) => m.profileId !== id),
        notifications: s.notifications.filter((n) => n.profileId !== id),
      };
      saveLocal(newState);
      return newState;
    });
    deleteProfileDB(id).catch(console.warn);
    persistAuthed(authedProfiles.filter((pid) => pid !== id));
  }, [authedProfiles, persistAuthed]);

  // ── Notifications ──
  const addNotification = useCallback(
    (notification: Omit<AppNotification, "id" | "createdAt" | "profileId" | "read">) => {
      const full: AppNotification = {
        id:
          "n-" +
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 8),
        ...notification,
        read: false,
        createdAt: new Date().toISOString(),
        profileId: state.activeProfileId,
      };
      setState((s) => {
        const newState: AppState = {
          ...s,
          notifications: [...s.notifications, full],
        };
        saveLocal(newState);
        return newState;
      });
      saveNotification(full).catch(console.warn);
      return full;
    },
    [state.activeProfileId]
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => {
      const newState: AppState = {
        ...s,
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      };
      saveLocal(newState);
      return newState;
    });
    const n = state.notifications.find((x) => x.id === id);
    if (n) saveNotification({ ...n, read: true }).catch(console.warn);
  }, [state.notifications]);

  const markAllNotificationsRead = useCallback(() => {
    const ids = state.notifications
      .filter((n) => n.profileId === state.activeProfileId && !n.read)
      .map((n) => n.id);
    if (ids.length === 0) return;
    setState((s) => {
      const newState: AppState = {
        ...s,
        notifications: s.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, read: true } : n
        ),
      };
      saveLocal(newState);
      return newState;
    });
  }, [state.notifications, state.activeProfileId]);

  const deleteNotification = useCallback((id: string) => {
    setState((s) => {
      const newState: AppState = {
        ...s,
        notifications: s.notifications.filter((n) => n.id !== id),
      };
      saveLocal(newState);
      return newState;
    });
    deleteNotificationDB(id).catch(console.warn);
  }, []);

  const getExpensesForDate = useCallback(
    (date: string) => {
      return state.expenses.filter(
        (e) => e.date === date && e.profileId === state.activeProfileId
      );
    },
    [state.expenses, state.activeProfileId]
  );

  const getDailyTotals = useCallback(() => {
    const totals: Record<string, { total: number; status: "under" | "near" | "over" }> = {};
    const budget = activeProfile?.dailyBudgetLimit ?? 150;
    state.expenses
      .filter((e) => e.profileId === state.activeProfileId)
      .forEach((e) => {
        if (!totals[e.date]) totals[e.date] = { total: 0, status: "under" };
        totals[e.date].total += e.amount;
      });
    Object.values(totals).forEach((d) => {
      const pct = d.total / budget;
      d.status = pct >= 1 ? "over" : pct >= 0.8 ? "near" : "under";
    });
    return totals;
  }, [state.expenses, state.activeProfileId, activeProfile?.dailyBudgetLimit ?? 150]);

  const getWeekTotal = useCallback(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    return state.expenses
      .filter((e) => e.profileId === state.activeProfileId && e.date >= weekStr)
      .reduce((s, e) => s + e.amount, 0);
  }, [state.expenses, state.activeProfileId]);

  const getMonthTotal = useCallback(() => {
    const monthPrefix = TODAY.slice(0, 7);
    return state.expenses
      .filter((e) => e.profileId === state.activeProfileId && e.date.startsWith(monthPrefix))
      .reduce((s, e) => s + e.amount, 0);
  }, [state.expenses, state.activeProfileId]);

  return {
    state,
    activeProfile,
    todayExpenses,
    loading,
    currency,
    activeNotifications,
    unreadCount,
    setActiveProfile,
    setCurrency,
    changePassword,
    logout,
    addExpense,
    deleteExpense,
    updateExpense,
    addMessage,
    addProfile,
    updateProfile,
    deleteProfile: deleteProfileFn,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    isProfileAuthed,
    verifyProfilePassword,
    getExpensesForDate,
    getDailyTotals,
    getWeekTotal,
    getMonthTotal,
    today: TODAY,
    adminPassword: ADMIN_PASSWORD,
  };
}
