import { useState, useCallback, useEffect } from "react";
import type { Expense, ChatMessage } from "./data";
import {
  loadProfiles,
  saveProfile,
  deleteProfile as deleteProfileDB,
  loadExpenses,
  saveExpense,
  deleteExpense as deleteExpenseDB,
  loadMessages,
  saveMessage,
  clearDB,
} from "./firestore";

export interface Profile {
  id: string;
  name: string;
  color: string;
  initial: string;
  dailyBudgetLimit: number;
  currency: "USD" | "PHP";
  password?: string;
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string;
  expenses: Expense[];
  messages: ChatMessage[];
  currency: "USD" | "PHP";
}

const STORAGE_KEY = "dotspend_state";
const AUTHED_KEY = "dotspend_authed_profiles";
const VERSION_KEY = "dotspend_state_version";
const STATE_VERSION = 2;
const TODAY = new Date().toISOString().slice(0, 10);

// Master admin password used to delete any profile.
export const ADMIN_PASSWORD =
  import.meta.env.VITE_ADMIN_PASSWORD || "dotspend-admin";

function getLocalState(): AppState | null {
  try {
    // Fresh start: if a version bump is detected, clear old seeded data.
    const version = localStorage.getItem(VERSION_KEY);
    if (version !== String(STATE_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTHED_KEY);
      localStorage.setItem(VERSION_KEY, String(STATE_VERSION));
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.profiles && parsed.expenses) return parsed;
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

// Fresh start: no seed data. App begins empty until the user creates profiles.
function getDefaultState(): AppState {
  return {
    profiles: [],
    activeProfileId: "",
    expenses: [],
    messages: [],
    currency: "USD",
  };
}

export function useStore() {
  const [state, setState] = useState<AppState>(
    getLocalState() || getDefaultState()
  );
  const [loading, setLoading] = useState(true);
  const [authedProfiles, setAuthedProfiles] = useState<string[]>(loadAuthed);

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
          // Wipe Firestore once so old default profiles don't reappear.
          withTimeout(clearDB(), 6000, undefined).catch(() => {});
        }

        const timeout = 5000;
        const [profiles, expenses, messages] = await Promise.all([
          withTimeout(loadProfiles(), timeout, []),
          withTimeout(loadExpenses(), timeout, []),
          withTimeout(loadMessages(), timeout, []),
        ]);

        if (cancelled) return;

        setState({
          profiles,
          activeProfileId: profiles[0]?.id || "",
          expenses,
          messages,
          currency: profiles[0]?.currency || "USD",
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

  const todayExpenses = state.expenses.filter(
    (e) => e.date === TODAY && e.profileId === state.activeProfileId
  );

  const isProfileAuthed = useCallback(
    (id: string) => authedProfiles.includes(id),
    [authedProfiles]
  );

  const verifyProfilePassword = useCallback(
    (id: string, password: string): boolean => {
      const profile = state.profiles.find((p) => p.id === id);
      if (!profile) return false;
      if (!profile.password) {
        persistAuthed([...authedProfiles, id]);
        return true;
      }
      if (password === profile.password) {
        persistAuthed([...authedProfiles, id]);
        return true;
      }
      return false;
    },
    [state.profiles, authedProfiles, persistAuthed]
  );

  const setActiveProfile = useCallback((id: string) => {
    setState((s) => {
      const profile = s.profiles.find((p) => p.id === id);
      const newState = { ...s, activeProfileId: id, currency: profile?.currency || s.currency };
      saveLocal(newState);
      return newState;
    });
  }, []);

  const setCurrency = useCallback((c: "USD" | "PHP") => {
    setState((s) => {
      const newState = { ...s, currency: c };
      saveLocal(newState);
      return newState;
    });
  }, []);

  const addExpense = useCallback((expense: Expense) => {
    const full: Expense = { ...expense, date: TODAY, profileId: state.activeProfileId };
    setState((s) => {
      const newState = { ...s, expenses: [...s.expenses, full] };
      saveLocal(newState);
      return newState;
    });
    saveExpense(full).catch(console.warn);
  }, [state.activeProfileId]);

  const deleteExpense = useCallback((id: number) => {
    setState((s) => {
      const newState = { ...s, expenses: s.expenses.filter((e) => e.id !== id) };
      saveLocal(newState);
      return newState;
    });
    deleteExpenseDB(id).catch(console.warn);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    const full: ChatMessage = { ...msg, date: TODAY, profileId: state.activeProfileId };
    setState((s) => {
      const newState = { ...s, messages: [...s.messages, full] };
      saveLocal(newState);
      return newState;
    });
    saveMessage(full).catch(console.warn);
  }, [state.activeProfileId]);

  const addProfile = useCallback((name: string, color: string, password?: string) => {
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const newProfile: Profile = {
      id,
      name,
      color,
      initial: name[0].toUpperCase(),
      dailyBudgetLimit: 150,
      currency: "USD",
      password: password || undefined,
    };
    setState((s) => {
      const newState = { ...s, profiles: [...s.profiles, newProfile] };
      saveLocal(newState);
      return newState;
    });
    saveProfile(newProfile).catch(console.warn);
    return id;
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<Profile>) => {
    setState((s) => {
      const newState = {
        ...s,
        profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      };
      saveLocal(newState);
      return newState;
    });
    const profile = state.profiles.find((p) => p.id === id);
    if (profile) saveProfile({ ...profile, ...updates }).catch(console.warn);
  }, [state.profiles]);

  const deleteProfileFn = useCallback((id: string) => {
    setState((s) => {
      const remaining = s.profiles.filter((p) => p.id !== id);
      if (remaining.length === 0) return s;
      const newState = {
        ...s,
        profiles: remaining,
        activeProfileId: s.activeProfileId === id ? remaining[0].id : s.activeProfileId,
        expenses: s.expenses.filter((e) => e.profileId !== id),
        messages: s.messages.filter((m) => m.profileId !== id),
      };
      saveLocal(newState);
      return newState;
    });
    deleteProfileDB(id).catch(console.warn);
    persistAuthed(authedProfiles.filter((pid) => pid !== id));
  }, [authedProfiles, persistAuthed]);

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
  }, [state.expenses, state.activeProfileId, activeProfile.dailyBudgetLimit]);

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
    setActiveProfile,
    setCurrency,
    addExpense,
    deleteExpense,
    addMessage,
    addProfile,
    updateProfile,
    deleteProfile: deleteProfileFn,
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
