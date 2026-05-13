import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, inr, loanProgress, downloadCSV } from "@/lib/store";
import { TrendingUp, TrendingDown, Wallet, Users, Download, Receipt as ReceiptIcon } from "lucide-react";

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
  const realizedProfit = issuedLoans.reduce((s, l) => s + loanProgress(l, data.emiPayments).realizedProfit, 0);
  const netProfit = realizedProfit - totalExpenses;

  const byCollector = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    data.emiPayments.forEach((p) => {
      const m = map.get(p.collectorUsername) ?? { count: 0, total: 0 };
      m.count++;
      m.total += p.amount;
      map.set(p.collectorUsername, m);
    });
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [data]);

  const closed = data.loans.filter((l) => l.status === "completed");

  const exports = {
    collections: () => {
      const rows: (string | number)[][] = [["Date", "Customer", "Loan ID", "Amount", "Collector", "Note"]];
      data.emiPayments.forEach((p) => {
        const c = data.customers.find((x) => x.id === p.customerId);
        rows.push([new Date(p.date).toLocaleString(), c?.name ?? "—", p.loanId, p.amount, p.collectorUsername, p.note ?? ""]);
      });
      downloadCSV("collections.csv", rows);
    },
    loans: () => {
      const rows: (string | number)[][] = [["Customer", "Loan", "Profit", "Total", "EMI Type", "EMI", "Duration(d)", "Start", "End", "Status"]];
      data.loans.forEach((l) => {
        const c = data.customers.find((x) => x.id === l.customerId);
        rows.push([
          c?.name ?? "—",
          l.amount,
          l.profit,
          l.amount + l.profit,
          l.emiType ?? "daily",
          l.emiAmount ?? l.dailyEmi,
          l.durationDays,
          l.startDate ? new Date(l.startDate).toLocaleDateString() : "",
          l.endDate ? new Date(l.endDate).toLocaleDateString() : "",
          l.status,
        ]);
      });
      downloadCSV("loans.csv", rows);
    },
    pending: () => {
      const rows: (string | number)[][] = [["Customer", "Loan", "Total", "Collected", "Pending"]];
      data.loans.filter((l) => l.status === "approved").forEach((l) => {
        const c = data.customers.find((x) => x.id === l.customerId);
        const pr = loanProgress(l, data.emiPayments);
        rows.push([c?.name ?? "—", l.amount, pr.totalDue, pr.paid, pr.remaining]);
      });
      downloadCSV("pending-balance.csv", rows);
    },
    savings: () => {
      const rows: (string | number)[][] = [["Date", "Customer", "Type", "Amount", "Note"]];
      data.savings.forEach((s) => {
        const c = data.customers.find((x) => x.id === s.customerId);
        rows.push([new Date(s.date).toLocaleDateString(), c?.name ?? "—", s.type ?? "deposit", s.amount, s.note ?? ""]);
      });
      downloadCSV("savings.csv", rows);
    },
    expenses: () => {
      const rows: (string | number)[][] = [["Date", "Category", "Amount", "Note"]];
      data.expenses.forEach((e) => rows.push([new Date(e.date).toLocaleDateString(), e.category, e.amount, e.note]));
      downloadCSV("expenses.csv", rows);
    },
  };

  return (
    <AppShell title="Reports" showBack>
      <div className="px-4 pt-4 space-y-4 animate-fade">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-5 shadow-card">
          <p className="text-xs opacity-80">Net Realized Profit (after expenses)</p>
          <p className="text-3xl font-bold">{inr(netProfit)}</p>
          <p className="text-xs opacity-80 mt-1">Expected once all loans complete: {inr(expectedProfit)}</p>
        </div>

        <Section title="Export CSV">
          <div className="grid grid-cols-2 gap-2 p-3">
            <ExportBtn label="Collections" onClick={exports.collections} />
            <ExportBtn label="Loans" onClick={exports.loans} />
            <ExportBtn label="Pending" onClick={exports.pending} />
            <ExportBtn label="Savings" onClick={exports.savings} />
            <ExportBtn label="Expenses" onClick={exports.expenses} />
          </div>
        </Section>

        <Section title="Collections">
          <Row label="Today" value={inr(collectedToday)} />
          <Row label="Last 7 days" value={inr(collectedWeek)} />
          <Row label="Last 30 days" value={inr(collectedMonth)} />
          <Row label="All time" value={inr(totalCollected)} bold />
        </Section>

        <Section title="By Collector">
          {byCollector.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">No collections yet</p>}
          {byCollector.map(([user, m]) => (
            <Row key={user} label={`${user} (${m.count} txns)`} value={inr(m.total)} />
          ))}
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

        {closed.length > 0 && (
          <Section title="Closed Loan Receipts">
            {closed.map((l) => {
              const c = data.customers.find((x) => x.id === l.customerId);
              const pr = loanProgress(l, data.emiPayments);
              return (
                <Link key={l.id} to="/receipt/$loanId" params={{ loanId: l.id }} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <ReceiptIcon className="size-4 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{c?.name}</p>
                    <p className="text-[11px] text-muted-foreground">Earned {inr(pr.realizedProfit)}</p>
                  </div>
                  <span className="text-xs text-primary">View →</span>
                </Link>
              );
            })}
          </Section>
        )}
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

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-accent rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97]">
      <Download className="size-3" /> {label}
    </button>
  );
}
