import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, inr, loanProgress, downloadCSV } from "@/lib/store";
import { Download, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/profit")({
  head: () => ({ meta: [{ title: "Profit — Smart Finance" }] }),
  component: Profit,
});

function Profit() {
  const data = useDB();
  const isInRange = (ts: number, days: number) => Date.now() - ts <= days * 86400000;

  const investedTotal = data.loans
    .filter((l) => l.status === "approved" || l.status === "completed")
    .reduce((s, l) => s + (l.investedAmount ?? l.amount), 0);

  const activeInvested = data.loans
    .filter((l) => l.status === "approved")
    .reduce((s, l) => s + (l.investedAmount ?? l.amount), 0);

  const expectedProfit = data.loans
    .filter((l) => l.status === "approved" || l.status === "completed")
    .reduce((s, l) => s + l.profit, 0);

  const realized = data.loans.reduce((s, l) => s + loanProgress(l, data.emiPayments).realizedProfit, 0);
  const pending = data.loans
    .filter((l) => l.status === "approved")
    .reduce((s, l) => s + loanProgress(l, data.emiPayments).pendingProfit, 0);

  const closedProfit = data.loans
    .filter((l) => l.status === "completed")
    .reduce((s, l) => s + loanProgress(l, data.emiPayments).realizedProfit, 0);

  // approximate per-period profit: split each payment's profit-portion proportionally
  function profitPortion(loanId: string, paymentAmount: number) {
    const loan = data.loans.find((l) => l.id === loanId);
    if (!loan) return 0;
    const ratio = loan.profit / (loan.amount + loan.profit);
    return paymentAmount * ratio;
  }
  const dailyP = data.emiPayments.filter((p) => isInRange(p.date, 1)).reduce((s, p) => s + profitPortion(p.loanId, p.amount), 0);
  const weeklyP = data.emiPayments.filter((p) => isInRange(p.date, 7)).reduce((s, p) => s + profitPortion(p.loanId, p.amount), 0);
  const monthlyP = data.emiPayments.filter((p) => isInRange(p.date, 30)).reduce((s, p) => s + profitPortion(p.loanId, p.amount), 0);

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ["Customer", "Invested", "Loan", "Total Payable", "Collected", "Remaining", "Earned Profit", "Pending Profit", "Status"],
    ];
    data.loans.forEach((l) => {
      const c = data.customers.find((x) => x.id === l.customerId);
      const pr = loanProgress(l, data.emiPayments);
      rows.push([
        c?.name ?? "—",
        l.investedAmount ?? l.amount,
        l.amount,
        l.amount + l.profit,
        pr.paid,
        pr.remaining,
        pr.realizedProfit,
        pr.pendingProfit,
        l.status,
      ]);
    });
    downloadCSV(`profit-by-loan-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <AppShell title="Profit Dashboard">
      <div className="px-4 pt-4 space-y-4 animate-fade">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-5 shadow-card">
          <p className="text-xs opacity-80 flex items-center gap-1"><TrendingUp className="size-3" /> Realized Profit</p>
          <p className="text-3xl font-bold">{inr(realized)}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="bg-white/15 rounded-lg p-2"><p className="opacity-80">Daily</p><p className="font-bold">{inr(dailyP)}</p></div>
            <div className="bg-white/15 rounded-lg p-2"><p className="opacity-80">Weekly</p><p className="font-bold">{inr(weeklyP)}</p></div>
            <div className="bg-white/15 rounded-lg p-2"><p className="opacity-80">Monthly</p><p className="font-bold">{inr(monthlyP)}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Tile label="Total Invested" value={inr(investedTotal)} />
          <Tile label="Active Investment" value={inr(activeInvested)} />
          <Tile label="Expected Profit" value={inr(expectedProfit)} />
          <Tile label="Pending Profit" value={inr(pending)} highlight />
          <Tile label="Closed Loan Profit" value={inr(closedProfit)} />
          <Tile label="Owner Capital" value={inr(data.ownerCapital)} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Profit by Loan</h2>
          <button onClick={exportCSV} className="text-xs bg-primary text-primary-foreground rounded-full px-3 py-1.5 font-semibold inline-flex items-center gap-1">
            <Download className="size-3" /> CSV
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-soft overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left p-2">Customer</th>
                <th className="text-right p-2">Invest</th>
                <th className="text-right p-2">Loan</th>
                <th className="text-right p-2">Earned</th>
                <th className="text-right p-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {data.loans.map((l) => {
                const c = data.customers.find((x) => x.id === l.customerId);
                const pr = loanProgress(l, data.emiPayments);
                return (
                  <tr key={l.id} className="border-t border-border">
                    <td className="p-2 truncate max-w-[100px]"><Link to="/customers/$id" params={{ id: l.customerId }}>{c?.name}</Link></td>
                    <td className="p-2 text-right">{inr(l.investedAmount ?? l.amount)}</td>
                    <td className="p-2 text-right">{inr(l.amount)}</td>
                    <td className="p-2 text-right text-success font-semibold">{inr(pr.realizedProfit)}</td>
                    <td className="p-2 text-right text-warning-foreground">{inr(pr.pendingProfit)}</td>
                  </tr>
                );
              })}
              {data.loans.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No loans yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 border shadow-soft ${highlight ? "bg-accent border-accent" : "bg-card border-border"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </div>
  );
}
