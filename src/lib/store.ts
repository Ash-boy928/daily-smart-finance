// Lightweight localStorage-backed store for Smart Finance (mock data, no backend yet)
import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "owner" | "collector";

export interface User {
  username: string;
  role: Role;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  aadhaarPhoto?: string; // dataURL
  createdAt: number;
}

export interface Loan {
  id: string;
  customerId: string;
  amount: number;
  profit: number;
  durationDays: number;
  dailyEmi: number;
  status: "pending" | "approved" | "rejected" | "completed";
  startDate?: number;
  createdAt: number;
}

export interface EmiPayment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  date: number;
  collectorUsername: string;
}

export interface Saving {
  id: string;
  customerId: string;
  amount: number;
  date: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  date: number;
}

interface DB {
  customers: Customer[];
  loans: Loan[];
  emiPayments: EmiPayment[];
  savings: Saving[];
  expenses: Expense[];
}

const KEY = "smartfinance_db_v1";
const SESSION_KEY = "smartfinance_session_v1";

const seed = (): DB => ({
  customers: [
    { id: "c1", name: "Ravi Kumar", phone: "9876543210", address: "MG Road, Bangalore", createdAt: Date.now() - 86400000 * 30 },
    { id: "c2", name: "Sita Devi", phone: "9123456780", address: "Anna Nagar, Chennai", createdAt: Date.now() - 86400000 * 20 },
    { id: "c3", name: "Mohan Lal", phone: "9988776655", address: "Park Street, Kolkata", createdAt: Date.now() - 86400000 * 10 },
  ],
  loans: [
    { id: "l1", customerId: "c1", amount: 10000, profit: 2000, durationDays: 120, dailyEmi: 100, status: "approved", startDate: Date.now() - 86400000 * 25, createdAt: Date.now() - 86400000 * 26 },
    { id: "l2", customerId: "c2", amount: 20000, profit: 4000, durationDays: 120, dailyEmi: 200, status: "approved", startDate: Date.now() - 86400000 * 15, createdAt: Date.now() - 86400000 * 16 },
    { id: "l3", customerId: "c3", amount: 5000, profit: 1000, durationDays: 60, dailyEmi: 100, status: "pending", createdAt: Date.now() - 86400000 * 2 },
  ],
  emiPayments: [
    { id: "e1", loanId: "l1", customerId: "c1", amount: 100, date: Date.now() - 86400000, collectorUsername: "collector" },
    { id: "e2", loanId: "l2", customerId: "c2", amount: 200, date: Date.now() - 86400000, collectorUsername: "collector" },
  ],
  savings: [
    { id: "s1", customerId: "c1", amount: 500, date: Date.now() - 86400000 * 5 },
  ],
  expenses: [
    { id: "x1", category: "Office Rent", amount: 5000, note: "Monthly rent", date: Date.now() - 86400000 * 3 },
    { id: "x2", category: "Travel", amount: 800, note: "Collector fuel", date: Date.now() - 86400000 },
  ],
});

let listeners = new Set<() => void>();
let cachedSnapshot: DB | null = null;
const serverSnapshot: DB = seed();

function read(): DB {
  if (typeof window === "undefined") return serverSnapshot;
  if (cachedSnapshot) return cachedSnapshot;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      cachedSnapshot = s;
      return s;
    }
    cachedSnapshot = JSON.parse(raw) as DB;
    return cachedSnapshot;
  } catch {
    cachedSnapshot = seed();
    return cachedSnapshot;
  }
}

function write(db: DB) {
  cachedSnapshot = db;
  localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(),
    () => serverSnapshot,
  );
}

export const db = {
  get: read,
  set: write,
  update(fn: (db: DB) => void) {
    const d = read();
    fn(d);
    write(d);
  },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Session
export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(user: User | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
  sessionListeners.forEach((l) => l());
}

const sessionListeners = new Set<() => void>();

export function useSession(): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    setUser(getSession());
    const cb = () => setUser(getSession());
    sessionListeners.add(cb);
    return () => {
      sessionListeners.delete(cb);
    };
  }, []);
  return user;
}

// Helpers
export function loanProgress(loan: Loan, payments: EmiPayment[]) {
  const paid = payments.filter((p) => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
  const totalDue = loan.amount + loan.profit;
  const remaining = Math.max(0, totalDue - paid);
  const daysPaid = Math.floor(paid / loan.dailyEmi);
  const daysRemaining = Math.max(0, loan.durationDays - daysPaid);
  return { paid, totalDue, remaining, daysPaid, daysRemaining, percent: Math.min(100, (paid / totalDue) * 100) };
}

export function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
