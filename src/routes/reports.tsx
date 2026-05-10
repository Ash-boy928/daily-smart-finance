import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, inr, loanProgress } from "@/lib/store";
import { TrendingUp, TrendingDown, Wallet, Users } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Smart Finance" }] }),
  component: Reports,
});

function Reports() {
  const data = useDB();
  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  const inLastDays = (ts: number, days: number) => Date.now() - ts <= days * 86400000;

  const collectedToday = data.emiPayments.filter((p) => isToday(p.date)).reduce((s, p) => s + p.amount, 0);
  const collectedWeek = data.emiPayments.filter((p) => inLastDays(p.date, 7)).reduce((s, p) => s + p.amount, 0);
  const collectedMonth = data.emiPayments.filter((p) => inLastDays(p.date, 30)).reduce((s, p) => s + p.amount, 0);
  const issuedLoans = data.loans.filter((l) => l.status === "approved" || l.status === "completed");
  const totalDisbursed = issuedLoans.reduce((s, l) => s + l.amount, 0);
  const totalCollected = data.emiPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
  const expectedProfit = issuedLoans.reduce((s, l) => s + l.profit, 0);
  // Realized profit is per-loan: only after that loan's principal is fully recovered
  const realizedProfit = issuedLoans.reduce((s, l) => s + loanProgress(l, data.emiPayments).realizedProfit, 0);
  const netProfit = realizedProfit - totalExpenses;

  return (
    <AppShell title="Reports" showBack>
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-5 shadow-card">
          <p className="text-xs opacity-80">Net Realized Profit (after expenses)</p>
          <p className="text-3xl font-bold">{inr(netProfit)}</p>
          <p className="text-xs opacity-80 mt-1">Expected once all loans complete: {inr(expectedProfit)}</p>
        </div>

        <Section title="Collections">
          <Row label="Today" value={inr(collectedToday)} />
          <Row label="Last 7 days" value={inr(collectedWeek)} />
          <Row label="Last 30 days" value={inr(collectedMonth)} />
          <Row label="All time" value={inr(totalCollected)} bold />
        </Section>

        <Section title="Loans">
          <Row icon={<Wallet className="size-4" />} label="Total disbursed" value={inr(totalDisbursed)} />
          <Row icon={<TrendingUp className="size-4 text-success" />} label="Expected profit" value={inr(expectedProfit)} />
          <Row icon={<TrendingUp className="size-4 text-success" />} label="Realized profit" value={inr(realizedProfit)} />
          <Row icon={<TrendingDown className="size-4 text-destructive" />} label="Total expenses" value={inr(totalExpenses)} />
        </Section>

        <Section title="Customers">
          <Row icon={<Users className="size-4" />} label="Total customers" value={String(data.customers.length)} />
          <Row label="Active loans" value={String(data.loans.filter((l) => l.status === "approved").length)} />
          <Row label="Pending approvals" value={String(data.loans.filter((l) => l.status === "pending").length)} />
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value, bold, icon }: { label: string; value: string; bold?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="flex items-center gap-2 text-foreground/80">{icon}{label}</span>
      <span className={bold ? "font-bold" : "font-semibold"}>{value}</span>
    </div>
  );
}
