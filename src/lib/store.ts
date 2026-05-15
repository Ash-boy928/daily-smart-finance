// Lightweight localStorage-backed store for Smart Finance (mock data, no backend yet)
import { useEffect, useState, useSyncExternalStore } from "react";

export type Role = "owner" | "collector";
export type EmiType = "daily" | "weekly" | "monthly";
export type SavingTxn = "deposit" | "withdrawal";

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
  aadhaarPhoto?: string;
  collectorUsername?: string;
  createdAt: number;
}

export interface CollectorAccount {
  username: string;
  password: string;
  name: string;
  photo?: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  customerId: string;
  // amount the customer receives = principal lent
  amount: number;
  // owner's invested capital backing this loan (defaults to amount if not set)
  investedAmount?: number;
  profit: number;
  durationDays: number;
  emiType?: EmiType;
  // legacy: dailyEmi kept; new code uses emiAmount via helper
  dailyEmi: number;
  emiAmount?: number;
  startDate?: number;
  endDate?: number;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: number;
  collectorUsername?: string;
}

export interface EmiPayment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  date: number;
  collectorUsername: string;
  note?: string;
}

export interface Saving {
  id: string;
  customerId: string;
  amount: number; // always positive; type tells direction
  type?: SavingTxn; // default deposit
  date: number;
  note?: string;
}

export interface SavingAccount {
  id: string;
  customerId: string;
  maturityMonths: number; // editable
  interestRatePct: number; // yearly %
  openedAt: number;
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
  savingAccounts: SavingAccount[];
  expenses: Expense[];
  collectorAccounts: CollectorAccount[];
  savingSmsAlerts: boolean;
  ownerCapital: number; // total capital owner injected
}

const KEY = "smartfinance_db_v2";
const SESSION_KEY = "smartfinance_session_v1";

const seed = (): DB => ({
  customers: [
    { id: "c1", name: "Ravi Kumar", phone: "9876543210", address: "MG Road, Bangalore", collectorUsername: "collector", createdAt: Date.now() - 86400000 * 30 },
    { id: "c2", name: "Sita Devi", phone: "9123456780", address: "Anna Nagar, Chennai", collectorUsername: "collector", createdAt: Date.now() - 86400000 * 20 },
    { id: "c3", name: "Mohan Lal", phone: "9988776655", address: "Park Street, Kolkata", collectorUsername: "collector", createdAt: Date.now() - 86400000 * 10 },
  ],
  loans: [
    { id: "l1", customerId: "c1", amount: 10000, investedAmount: 10000, profit: 2000, durationDays: 120, emiType: "daily", dailyEmi: 100, emiAmount: 100, status: "approved", startDate: Date.now() - 86400000 * 25, endDate: Date.now() - 86400000 * 25 + 120 * 86400000, createdAt: Date.now() - 86400000 * 26 },
    { id: "l2", customerId: "c2", amount: 20000, investedAmount: 20000, profit: 4000, durationDays: 120, emiType: "daily", dailyEmi: 200, emiAmount: 200, status: "approved", startDate: Date.now() - 86400000 * 15, endDate: Date.now() - 86400000 * 15 + 120 * 86400000, createdAt: Date.now() - 86400000 * 16 },
    { id: "l3", customerId: "c3", amount: 5000, investedAmount: 5000, profit: 1000, durationDays: 60, emiType: "daily", dailyEmi: 100, emiAmount: 100, status: "pending", createdAt: Date.now() - 86400000 * 2 },
  ],
  emiPayments: [
    { id: "e1", loanId: "l1", customerId: "c1", amount: 100, date: Date.now() - 86400000, collectorUsername: "collector" },
    { id: "e2", loanId: "l2", customerId: "c2", amount: 200, date: Date.now() - 86400000, collectorUsername: "collector" },
  ],
  savings: [
    { id: "s1", customerId: "c1", amount: 500, type: "deposit", date: Date.now() - 86400000 * 5 },
  ],
  savingAccounts: [
    { id: "sa1", customerId: "c1", maturityMonths: 12, interestRatePct: 6, openedAt: Date.now() - 86400000 * 30 },
  ],
  expenses: [
    { id: "x1", category: "Office Rent", amount: 5000, note: "Monthly rent", date: Date.now() - 86400000 * 3 },
    { id: "x2", category: "Travel", amount: 800, note: "Collector fuel", date: Date.now() - 86400000 },
  ],
  collectorAccounts: [
    { username: "collector", password: "collect123", name: "Suresh", createdAt: Date.now() - 86400000 * 30 },
  ],
  savingSmsAlerts: false,
  ownerCapital: 100000,
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
    const parsed = JSON.parse(raw) as Partial<DB>;
    // safety: ensure new collections exist
    const collectorAccounts = parsed.collectorAccounts ?? [
      { username: "collector", password: "collect123", name: "Suresh", createdAt: Date.now() - 86400000 * 30 },
    ];
    const defaultCollector = collectorAccounts[0]?.username;
    const safe: DB = {
      customers: (parsed.customers ?? []).map((c) => ({ ...c, collectorUsername: c.collectorUsername ?? defaultCollector })),
      loans: parsed.loans ?? [],
      emiPayments: parsed.emiPayments ?? [],
      savings: parsed.savings ?? [],
      savingAccounts: parsed.savingAccounts ?? [],
      expenses: parsed.expenses ?? [],
      collectorAccounts,
      savingSmsAlerts: parsed.savingSmsAlerts ?? false,
      ownerCapital: parsed.ownerCapital ?? 0,
    };
    cachedSnapshot = safe;
    return safe;
  } catch {
    cachedSnapshot = seed();
    return cachedSnapshot;
  }
}

function write(db: DB) {
  cachedSnapshot = db;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    // localStorage full — likely large image. Drop aadhaar photos and retry.
    try {
      const slim = { ...db, customers: db.customers.map((c) => ({ ...c, aadhaarPhoto: undefined })) };
      localStorage.setItem(KEY, JSON.stringify(slim));
      cachedSnapshot = slim;
    } catch {
      console.error("Storage failed:", e);
    }
  }
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
    const d = JSON.parse(JSON.stringify(read())) as DB;
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

export function getLoginAccounts(): (User & { password: string })[] {
  const collectors = read().collectorAccounts.map((c) => ({
    username: c.username,
    password: c.password,
    role: "collector" as const,
    name: c.name,
  }));
  return [{ username: "owner", password: "owner123", role: "owner", name: "Admin" }, ...collectors];
}

const sessionListeners = new Set<() => void>();

export function useSession(): User | null {
  const [user, setUser] = useState<User | null>(() => getSession());
  useEffect(() => {
    const cb = () => setUser(getSession());
    sessionListeners.add(cb);
    return () => {
      sessionListeners.delete(cb);
    };
  }, []);
  return user;
}

// Helpers
export const MIN_LOANABLE = 5000;

export function emiTypeOf(loan: Loan): EmiType {
  return loan.emiType ?? "daily";
}

export function emiAmountOf(loan: Loan): number {
  return loan.emiAmount ?? loan.dailyEmi ?? 0;
}

// Convert a loan's duration to # of EMI installments based on emiType
export function installmentsOf(loan: Loan): number {
  const t = emiTypeOf(loan);
  if (t === "daily") return loan.durationDays;
  if (t === "weekly") return Math.max(1, Math.ceil(loan.durationDays / 7));
  return Math.max(1, Math.ceil(loan.durationDays / 30));
}

export function calcEmi(amount: number, profit: number, durationDays: number, type: EmiType) {
  const total = amount + profit;
  let installments = durationDays;
  if (type === "weekly") installments = Math.max(1, Math.ceil(durationDays / 7));
  if (type === "monthly") installments = Math.max(1, Math.ceil(durationDays / 30));
  return Math.ceil(total / installments);
}

export function loanProgress(loan: Loan, payments: EmiPayment[]) {
  const paid = payments.filter((p) => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
  const totalDue = loan.amount + loan.profit;
  const remaining = Math.max(0, totalDue - paid);
  const emi = emiAmountOf(loan);
  const unitsPaid = emi > 0 ? Math.floor(paid / emi) : 0;
  const totalUnits = installmentsOf(loan);
  const unitsRemaining = Math.max(0, totalUnits - unitsPaid);
  const realizedProfit = Math.max(0, paid - loan.amount);
  const pendingProfit = loan.profit - realizedProfit;
  return {
    paid,
    totalDue,
    remaining,
    daysPaid: unitsPaid,
    daysRemaining: unitsRemaining,
    realizedProfit,
    pendingProfit,
    percent: totalDue > 0 ? Math.min(100, (paid / totalDue) * 100) : 0,
  };
}

// Expected installments due so far based on start date (for overdue detection)
export function expectedDueByNow(loan: Loan): number {
  if (!loan.startDate) return 0;
  const now = Date.now();
  const elapsedDays = Math.max(0, Math.floor((now - loan.startDate) / 86400000));
  const t = emiTypeOf(loan);
  let units = elapsedDays;
  if (t === "weekly") units = Math.floor(elapsedDays / 7);
  if (t === "monthly") units = Math.floor(elapsedDays / 30);
  units = Math.min(units + 1, installmentsOf(loan));
  return units * emiAmountOf(loan);
}

export function isLoanOverdue(loan: Loan, payments: EmiPayment[]): boolean {
  if (loan.status !== "approved") return false;
  const today = new Date().toDateString();
  const paidToday = payments
    .filter((p) => p.loanId === loan.id && new Date(p.date).toDateString() === today)
    .reduce((s, p) => s + p.amount, 0);
  if (paidToday >= emiAmountOf(loan)) return false;
  const paid = payments.filter((p) => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
  return paid + 1 < expectedDueBeforeToday(loan);
}

function expectedDueBeforeToday(loan: Loan): number {
  if (!loan.startDate) return 0;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const elapsedDays = Math.max(0, Math.floor((startOfToday.getTime() - loan.startDate) / 86400000));
  const t = emiTypeOf(loan);
  let units = elapsedDays;
  if (t === "weekly") units = Math.floor(elapsedDays / 7);
  if (t === "monthly") units = Math.floor(elapsedDays / 30);
  return Math.min(units, installmentsOf(loan)) * emiAmountOf(loan);
}

// Short human-friendly loan id (e.g. "L-AB12CD")
export function shortLoanId(loanId: string): string {
  return "L-" + loanId.slice(0, 6).toUpperCase();
}

export function shortSavingId(savingId: string): string {
  return "S-" + savingId.slice(0, 6).toUpperCase();
}

// Returns saving customers who have NOT made a deposit today (i.e. saving collection pending)
export function savingPendingToday(
  customers: Customer[],
  savingAccounts: SavingAccount[],
  savings: Saving[],
): Customer[] {
  const today = new Date().toDateString();
  const accountIds = new Set(savingAccounts.map((a) => a.customerId));
  const customersWithDepositHistory = new Set(savings.filter((s) => s.type !== "withdrawal").map((s) => s.customerId));
  return customers.filter((c) => {
    const hasAccount = accountIds.has(c.id) || customersWithDepositHistory.has(c.id);
    if (!hasAccount) return false;
    const depositedToday = savings.some(
      (s) => s.customerId === c.id && s.type !== "withdrawal" && new Date(s.date).toDateString() === today,
    );
    return !depositedToday;
  });
}

// Savings helpers
export function savingsBalance(customerId: string, all: Saving[]): number {
  return all
    .filter((s) => s.customerId === customerId)
    .reduce((sum, s) => sum + (s.type === "withdrawal" ? -s.amount : s.amount), 0);
}

export function savingsInterestEarned(account: SavingAccount, balance: number): number {
  const months = Math.max(1, (Date.now() - account.openedAt) / (86400000 * 30));
  return Math.round((balance * account.interestRatePct * months) / 1200);
}

export function inr(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// CSV utility
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Image compression: resize to max width 800, JPEG ~0.7 quality
export function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
