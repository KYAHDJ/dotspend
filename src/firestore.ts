import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { Expense, ChatMessage } from "./data";
import type { Profile } from "./store";

function guard<T>(fn: () => Promise<T>, fallback: T): () => Promise<T> {
  return async () => {
    if (!isFirebaseConfigured || !db) return fallback;
    try {
      return await fn();
    } catch (err) {
      console.warn("Firestore operation failed:", err);
      return fallback;
    }
  };
}

// ── Profiles ──

export const loadProfiles = guard<Profile[]>(async () => {
  const snap = await getDocs(collection(db!, "profiles"));
  return snap.docs.map((d) => d.data() as Profile);
}, []);

export async function saveProfile(profile: Profile): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, "profiles", profile.id), profile);
  } catch (err) {
    console.warn("saveProfile failed:", err);
  }
}

export async function deleteProfile(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "profiles", id));
  } catch (err) {
    console.warn("deleteProfile failed:", err);
  }
}

// ── Expenses ──

export const loadExpenses = guard<Expense[]>(async () => {
  const snap = await getDocs(
    query(collection(db!, "expenses"), orderBy("id", "desc"))
  );
  return snap.docs.map((d) => d.data() as Expense);
}, []);

export async function saveExpense(expense: Expense): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, "expenses", String(expense.id)), expense);
  } catch (err) {
    console.warn("saveExpense failed:", err);
  }
}

export async function deleteExpense(id: number): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "expenses", String(id)));
  } catch (err) {
    console.warn("deleteExpense failed:", err);
  }
}

// ── Messages ──

export const loadMessages = guard<ChatMessage[]>(async () => {
  const snap = await getDocs(
    query(collection(db!, "messages"), orderBy("id", "desc"))
  );
  return snap.docs.map((d) => d.data() as ChatMessage);
}, []);

export async function saveMessage(msg: ChatMessage): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, "messages", String(msg.id)), msg);
  } catch (err) {
    console.warn("saveMessage failed:", err);
  }
}

// ── Bulk save (for initial data seeding) ──

export async function seedData(
  profiles: Profile[],
  expenses: Expense[],
  messages: ChatMessage[]
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const batch1 = profiles.map((p) => saveProfile(p));
    const batch2 = expenses.map((e) => saveExpense(e));
    const batch3 = messages.map((m) => saveMessage(m));
    await Promise.all([...batch1, ...batch2, ...batch3]);
  } catch (err) {
    console.warn("seedData failed:", err);
  }
}
