import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Expense, ChatMessage } from "./data";
import type { Profile } from "./store";

// ── Profiles ──

export async function loadProfiles(): Promise<Profile[]> {
  const snap = await getDocs(collection(db, "profiles"));
  return snap.docs.map((d) => d.data() as Profile);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setDoc(doc(db, "profiles", profile.id), profile);
}

export async function deleteProfile(id: string): Promise<void> {
  await deleteDoc(doc(db, "profiles", id));
}

// ── Expenses ──

export async function loadExpenses(): Promise<Expense[]> {
  const snap = await getDocs(
    query(collection(db, "expenses"), orderBy("id", "desc"))
  );
  return snap.docs.map((d) => d.data() as Expense);
}

export async function saveExpense(expense: Expense): Promise<void> {
  await setDoc(doc(db, "expenses", String(expense.id)), expense);
}

export async function deleteExpense(id: number): Promise<void> {
  await deleteDoc(doc(db, "expenses", String(id)));
}

// ── Messages ──

export async function loadMessages(): Promise<ChatMessage[]> {
  const snap = await getDocs(
    query(collection(db, "messages"), orderBy("id", "desc"))
  );
  return snap.docs.map((d) => d.data() as ChatMessage);
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  await setDoc(doc(db, "messages", String(msg.id)), msg);
}

// ── Bulk save (for initial data seeding) ──

export async function seedData(
  profiles: Profile[],
  expenses: Expense[],
  messages: ChatMessage[]
): Promise<void> {
  const batch1 = profiles.map((p) => saveProfile(p));
  const batch2 = expenses.map((e) => saveExpense(e));
  const batch3 = messages.map((m) => saveMessage(m));
  await Promise.all([...batch1, ...batch2, ...batch3]);
}
