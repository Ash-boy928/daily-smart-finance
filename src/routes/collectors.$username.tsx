import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, loanProgress, savingsBalance, inr, isLoanOverdue, emiAmountOf } from "@/lib/store";
import { ChevronRight, Users, Wallet, PiggyBank, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/collectors/$username")({
  head: () => ({ meta: [{ title: "Collector — Smart Finance" }] }),
  component: CollectorDetail,
});

function CollectorDetail() {
  const { username } = Route.useParams();
  const data = useDB();
  const collector = data.collectorAccounts.find((c) => c.username === username);
  const customers = data.customers.filter((c) => c.collectorUsername === username);

  const customerIds = new Set(customers.map((c) => c.id));
  const loans = data.loans.filter((l) => customerIds.has(l.customerId));
  const activeLoans = loans.filter((l) => l.status === "approved");
  const totalReceivable = activeLoans.reduce((s, l) => s + loanProgress(l, data.emiPayments).remaining, 0);
  const totalSavings = customers.reduce((s, c) => s + savingsBalance(c.id, data.savings), 0);
  const overdueCount = activeLoans.filter((l) => isLoanOverdue(l, data.emiPayments)).length;

  if (!collector) {
    return (
      <AppShell title="Collector" showBack>
        <p className="px-4 pt-6 text-sm text-muted-foreground">Collector not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={collector.name} showBack>
      <div className="px-4 pt-4 animate-fade">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-soft">
          {collector.photo ? (
            <img src={collector.photo} alt={collector.name} className="size-14 rounded-full object-cover" />
          ) : (
            <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-xl">
              {collector.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{collector.name}</p>
            <p className="text-xs text-muted-foreground">@{collector.username}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat icon={<Users className="size-4" />} label="Customers" value={String(customers.length)} />
          <Stat icon={<Wallet className="size-4" />} label="Active Loans" value={String(activeLoans.length)} />
          <Stat icon={<PiggyBank className="size-4" />} label="Savings" value={inr(totalSavings)} />
          <Stat icon={<AlertCircle className="size-4 text-destructive" />} label="Overdue" value={String(overdueCount)} danger={overdueCount > 0} />
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 mb-2">Total receivable from this collector: <span className="font-semibold text-foreground">{inr(totalReceivable)}</span></p>

        <h2 className="text-sm font-semibold mt-3 mb-2">Customers</h2>
        <div className="space-y-2 pb-4">
          {customers.map((c) => {
            const cLoans = loans.filter((l) => l.customerId === c.id);
            const active = cLoans.find((l) => l.status === "approved");
            const pending = cLoans.filter((l) => l.status === "pending").length;
            const sav = savingsBalance(c.id, data.savings);
            const prog = active ? loanProgress(active, data.emiPayments) : null;
            const overdue = active ? isLoanOverdue(active, data.emiPayments) : false;
            return (
              <Link
                key={c.id}
                to="/customers/$id"
                params={{ id: c.id }}
                className={`block rounded-2xl border p-3 shadow-soft active:scale-[0.99] animate-pop ${overdue ? "border-destructive/40 bg-destructive/5" : "bg-card border-border"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                      {c.name}
                      {overdue && <span className="text-[9px] bg-destructive text-destructive-foreground rounded-full px-1.5 font-bold">OVERDUE</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.phone}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <Mini label="Loan" value={active ? inr(active.amount) : "—"} />
                  <Mini label="Pending" value={prog ? inr(prog.remaining) : (pending ? `${pending} req` : "—")} />
                  <Mini label="Savings" value={inr(sav)} />
                </div>
                {active && prog && (
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${prog.percent}%` }} />
                  </div>
                )}
                {active && (
                  <p className="mt-1 text-[10px] text-muted-foreground">EMI {inr(emiAmountOf(active))} · {prog?.daysPaid}/{prog ? prog.daysPaid + prog.daysRemaining : 0} paid</p>
                )}
              </Link>
            );
          })}
          {customers.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8 bg-card rounded-2xl border border-border">
              No customers assigned yet
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 border shadow-soft ${danger ? "bg-destructive/10 border-destructive/30" : "bg-card border-border"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}<span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-2 py-1">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
