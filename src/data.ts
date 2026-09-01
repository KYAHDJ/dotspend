export interface Expense {
  id: number;
  label: string;
  amount: number;
  currency: string;
  category: string;
  time: string;
  location: string;
  member: string;
  memberColor: string;
  memberInitial: string;
  date: string;
  profileId: string;
}

export interface ChatMessage {
  id: number;
  from: "user" | "ai";
  text: string;
  time: string;
  isAlert?: boolean;
  date: string;
  profileId: string;
}

// Extensible payload field so Groq AI can later inject alerts / financial
// insights directly into the notification drawer without schema changes.
export type NotificationType =
  | "budget"
  | "expense"
  | "insight"
  | "alert"
  | "custom";

export interface NotificationPayload {
  // Reserved for future AI / Groq integration.
  source?: string;
  confidence?: number;
  amount?: number;
  category?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string; // ISO timestamp
  profileId: string;
  payload?: NotificationPayload;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#612AD5",
  Transport: "#E9B380",
  Clothes: "#CBE353",
  Entertainment: "#FF6B6B",
  Health: "#4ECDC4",
  Groceries: "#A78BFA",
  Other: "#6B7280",
};

export const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍽️",
  Transport: "🚌",
  Clothes: "🛍️",
  Entertainment: "🎬",
  Health: "💊",
  Groceries: "🛒",
  Other: "📦",
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

const TODAY = new Date().toISOString().slice(0, 10);

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 1,
    label: "Blue Bottle Coffee",
    amount: 6.5,
    currency: "USD",
    category: "Food",
    time: "7:48 AM",
    location: "SoHo, NY",
    member: "David",
    memberColor: "#612AD5",
    memberInitial: "D",
    date: TODAY,
    profileId: "david",
  },
  {
    id: 2,
    label: "Subway to Midtown",
    amount: 2.9,
    currency: "USD",
    category: "Transport",
    time: "8:15 AM",
    location: "Canal St Station, NY",
    member: "David",
    memberColor: "#612AD5",
    memberInitial: "D",
    date: TODAY,
    profileId: "david",
  },
  {
    id: 3,
    label: "Sweetgreen Lunch Bowl",
    amount: 17.25,
    currency: "USD",
    category: "Food",
    time: "12:20 PM",
    location: "Midtown, NY",
    member: "David",
    memberColor: "#612AD5",
    memberInitial: "D",
    date: TODAY,
    profileId: "david",
  },
  {
    id: 4,
    label: "Uniqlo Fleece Jacket",
    amount: 59.9,
    currency: "USD",
    category: "Clothes",
    time: "1:45 PM",
    location: "Fifth Ave, NY",
    member: "Sarah",
    memberColor: "#E9B380",
    memberInitial: "S",
    date: TODAY,
    profileId: "david",
  },
  {
    id: 5,
    label: "Uber Pool — Office Return",
    amount: 11.4,
    currency: "USD",
    category: "Transport",
    time: "5:32 PM",
    location: "Times Square, NY",
    member: "David",
    memberColor: "#612AD5",
    memberInitial: "D",
    date: TODAY,
    profileId: "david",
  },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    from: "ai",
    text: "Good evening, David. You've logged $97.95 today — 65% of your $150 daily budget. Clothes is your largest category at $59.90.",
    time: "5:35 PM",
    date: TODAY,
    profileId: "david",
  },
  {
    id: 2,
    from: "ai",
    text: "Alert: Food spending is at $23.75 — 59% of your $40 food sub-budget. Keep dinner under $16 to stay on track.",
    time: "5:35 PM",
    isAlert: true,
    date: TODAY,
    profileId: "david",
  },
];
