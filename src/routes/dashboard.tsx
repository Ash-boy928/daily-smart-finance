import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, useSession, loanProgress, inr, isLoanOverdue, emiAmountOf } from "@/lib/store";
import { Users, Wallet, TrendingUp, AlertCircle, PlusCircle, IndianRupee, Receipt, PiggyBank, ClipboardCheck, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Smart Finance" }] }),
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const data = useDB();

  const today = new Date();
  const isToday = (ts: number) => new Date(ts).toDateString() === today.toDateString();

  const activeLoans = data.loans.filter((l) => l.status === "approved");
  const issuedLoans = data.loans.filter((l) => l.status === "approved" || l.status === "completed");
  const totalReceivable = activeLoans.reduce((s, l) => s + loanProgress(l, data.emiPayments).remaining, 0);
  const totalCollected = data.emiPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);
  const realizedProfit = issuedLoans.reduce((s, l) => s + loanProgress(l, data.emiPayments).realizedProfit, 0);
  const netProfit = realizedProfit - totalExpenses;
  const todayCollected = data.emiPayments.filter((p) => isToday(p.date)).reduce((s, p) => s + p.amount, 0);
  const expectedToday = activeLoans.reduce((s, l) => s + emiAmountOf(l), 0);
  const pendingToday = Math.max(0, expectedToday - todayCollected);
  const pendingLoans = data.loans.filter((l) => l.status === "pending").length;
  const overdueCount = activeLoans.filter((l) => isLoanOverdue(l, data.emiPayments)).length;

  const isOwner = session?.role === "owner";

  return (
    <AppShell title="Dashboard">
      <div className="px-4 pt-4 -mt-2 animate-fade">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-5 shadow-card">
          <p className="text-xs opacity-80">Today's Loan Collection</p>
          <p className="text-3xl font-bold mt-1">{inr(todayCollected)}</p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="opacity-80">Expected: {inr(expectedToday)}</span>
            <span className="bg-white/20 rounded-full px-2 py-0.5">Pending: {inr(pendingToday)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <Stat icon={<Users className="size-4" />} label="Customers" value={String(data.customers.length)} />
        <Stat icon={<Wallet className="size-4" />} label="Active Loans" value={String(activeLoans.length)} />
        {isOwner && (
          <>
            <Stat icon={<IndianRupee className="size-4" />} label="Total Receivable" value={inr(totalReceivable)} />
            <Stat icon={<TrendingUp className="size-4 text-success" />} label="Net Profit" value={inr(Math.max(0, netProfit))} highlight />
            <Stat icon={<AlertCircle className="size-4 text-destructive" />} label="Overdue" value={String(overdueCount)} danger={overdueCount > 0} />
          </>
        )}
        {!isOwner && (
          <>
            <Stat icon={<AlertCircle className="size-4" />} label="Pending Today" value={inr(pendingToday)} highlight />
            <Stat icon={<ClipboardCheck className="size-4" />} label="Collected" value={inr(todayCollected)} />
          </>
        )}
      </div>

      <div className="px-4 mt-5">
        <h2 className="text-sm font-semibold text-foreground mb-2">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2">
          <Action to="/customers/new" icon={<PlusCircle className="size-5" />} label="Add" />
          <Action to="/customers" icon={<Users className="size-5" />} label="List" />
          <Action to="/collect" icon={<IndianRupee className="size-5" />} label="Collect" />
          {isOwner && <Action to="/loans" icon={<ClipboardCheck className="size-5" />} label="Loans" badge={pendingLoans} />}
          <Action to="/savings" icon={<PiggyBank className="size-5" />} label="Savings" />
          {isOwner && <Action to="/profit" icon={<TrendingUp className="size-5" />} label="Profit" />}
          {isOwner && <Action to="/expenses" icon={<Receipt className="size-5" />} label="Expense" />}
          {isOwner && <Action to="/reports" icon={<FileBarChart className="size-5" />} label="Reports" />}
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Pending EMIs Today</h2>
          <Link to="/collect" className="text-xs text-primary font-medium">See all</Link>
        </div>
        <div className="space-y-2">
          {activeLoans.slice(0, 5).map((loan) => {
            const cust = data.customers.find((c) => c.id === loan.customerId);
            const paidToday = data.emiPayments.filter((p) => p.loanId === loan.id && isToday(p.date)).reduce((s, p) => s + p.amount, 0);
            const emi = emiAmountOf(loan);
            const due = Math.max(0, emi - paidToday);
            const { percent } = loanProgress(loan, data.emiPayments);
            const overdue = isLoanOverdue(loan, data.emiPayments);
            return (
              <Link
                key={loan.id}
                to="/customers/$id"
                params={{ id: loan.customerId }}
                className={`block rounded-2xl border p-3 shadow-soft active:scale-[0.99] animate-pop ${overdue ? "border-destructive/40 bg-destructive/5" : "bg-card border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                      {cust?.name ?? "—"}
                      {overdue && <span className="text-[9px] bg-destructive text-destructive-foreground rounded-full px-1.5 font-bold">OVERDUE</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{inr(loan.amount)} · {loan.durationDays}d</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${due === 0 ? "text-success" : "text-foreground"}`}>{due === 0 ? "Paid ✓" : inr(due)}</p>
                    <p className="text-[10px] text-muted-foreground">EMI {inr(emi)}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </Link>
            );
          })}
          {activeLoans.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8 bg-card rounded-2xl border border-border">
              No active loans yet
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value, highlight, danger }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 border shadow-soft ${danger ? "bg-destructive/10 border-destructive/30" : highlight ? "bg-accent border-accent" : "bg-card border-border"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function Action({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link to={to} className="relative bg-card border border-border rounded-2xl flex flex-col items-center gap-1 py-3 active:scale-[0.97] shadow-soft">
      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <span className="text-[11px] font-medium">{label}</span>
      {badge ? (
        <span className="absolute top-1 right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[9px] grid place-items-center">{badge}</span>
      ) : null}
    </Link>
  );
}
