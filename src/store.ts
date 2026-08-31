import { useState, useCallback, useEffect, useRef } from "react";
import { INITIAL_EXPENSES, INITIAL_MESSAGES } from "./data";
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
  seedData,
} from "./firestore";

export interface Profile {
  id: string;
  name: string;
  color: string;
  initial: string;
  dailyBudgetLimit: number;
  currency: "USD" | "PHP";
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string;
  expenses: Expense[];
  messages: ChatMessage[];
  currency: "USD" | "PHP";
}

const STORAGE_KEY = "dotspend_state";
const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_PROFILES: Profile[] = [
  { id: "david", name: "David", color: "#612AD5", initial: "D", dailyBudgetLimit: 150, currency: "USD" },
  { id: "shared", name: "Shared", color: "#E9B380", initial: "H", dailyBudgetLimit: 200, currency: "USD" },
];

function getLocalState(): AppState | null {
  try {
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
  } catch { /* ignore */ }
}

function getDefaultState(): AppState {
  return {
    profiles: DEFAULT_PROFILES,
    activeProfileId: "david",
    expenses: INITIAL_EXPENSES.map((e) => ({ ...e, date: TODAY, profileId: "david" })),
    messages: INITIAL_MESSAGES.map((m) => ({ ...m, date: TODAY, profileId: "david" })),
    currency: "USD",
  };
}

export function useStore() {
  const [state, setState] = useState<AppState>(getLocalState() || getDefaultState());
  const [loading, setLoading] = useState(true);
  const seeded = useRef(false);

  // Load from Firestore on mount
  useEffect(() => {
    (async () => {
      try {
        const [profiles, expenses, messages] = await Promise.all([
          loadProfiles(),
          loadExpenses(),
          loadMessages(),
        ]);

        if (profiles.length > 0) {
          setState({
            profiles,
            activeProfileId: profiles[0].id,
            expenses,
            messages,
            currency: profiles[0].currency || "USD",
          });
        } else if (!seeded.current) {
          // First run — seed Firestore with defaults
          seeded.current = true;
          await seedData(
            DEFAULT_PROFILES,
            INITIAL_EXPENSES.map((e) => ({ ...e, date: TODAY, profileId: "david" })),
            INITIAL_MESSAGES.map((m) => ({ ...m, date: TODAY, profileId: "david" }))
          );
          const newState: AppState = {
            profiles: DEFAULT_PROFILES,
            activeProfileId: "david",
            expenses: INITIAL_EXPENSES.map((e) => ({ ...e, date: TODAY, profileId: "david" })),
            messages: INITIAL_MESSAGES.map((m) => ({ ...m, date: TODAY, profileId: "david" })),
            currency: "USD",
          };
          setState(newState);
          saveLocal(newState);
        }
      } catch (err) {
        console.warn("Firestore unavailable, using local data:", err);
      }
      setLoading(false);
    })();
  }, []);

  // Persist to both localStorage and Firestore on state change
  useEffect(() => {
    if (loading) return;
    saveLocal(state);
  }, [state, loading]);

  const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];

  const todayExpenses = state.expenses.filter(
    (e) => e.date === TODAY && e.profileId === state.activeProfileId
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

  const addProfile = useCallback((name: string, color: string) => {
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const newProfile: Profile = {
      id,
      name,
      color,
      initial: name[0].toUpperCase(),
      dailyBudgetLimit: 150,
      currency: "USD",
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
    const budget = activeProfile.dailyBudgetLimit;
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
    getExpensesForDate,
    getDailyTotals,
    getWeekTotal,
    getMonthTotal,
    today: TODAY,
  };
}
