import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, useSession, db, uid, inr, loanProgress, emiAmountOf, emiTypeOf, isLoanOverdue } from "@/lib/store";
import { Check, Search, X, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/collect")({
  head: () => ({ meta: [{ title: "EMI Collection — Smart Finance" }] }),
  component: Collect,
});

function Collect() {
  const data = useDB();
  const session = useSession();
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ loanId: string; customerId: string; name: string; amount: string; note: string } | null>(null);

  const today = new Date();
  const isToday = (ts: number) => new Date(ts).toDateString() === today.toDateString();

  const myCustomerIds = session?.role === "collector"
    ? new Set(data.customers.filter((c) => c.collectorUsername === session.username).map((c) => c.id))
    : null;
  const active = data.loans.filter((l) => l.status === "approved" && (!myCustomerIds || myCustomerIds.has(l.customerId)));
  const items = active
    .map((loan) => {
      const cust = data.customers.find((c) => c.id === loan.customerId);
      const paidToday = data.emiPayments.filter((p) => p.loanId === loan.id && isToday(p.date)).reduce((s, p) => s + p.amount, 0);
      const { remaining } = loanProgress(loan, data.emiPayments);
      const overdue = isLoanOverdue(loan, data.emiPayments);
      return { loan, cust, paidToday, remaining, overdue };
    })
    .filter(({ cust }) => !q || cust?.name.toLowerCase().includes(q.toLowerCase()) || cust?.phone.includes(q))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue));

  const submit = (loanId: string, customerId: string, amount: number, name: string, maxRemaining: number, note: string) => {
    if (!amount || amount <= 0) return;
    const final = Math.min(amount, maxRemaining);
    let completed = false;
    db.update((dd) => {
      dd.emiPayments.unshift({
        id: uid(),
        loanId,
        customerId,
        amount: final,
        date: Date.now(),
        collectorUsername: session?.username ?? "unknown",
        note: note.trim() || undefined,
      });
      const loan = dd.loans.find((l) => l.id === loanId);
      if (loan) {
        const paid = dd.emiPayments.filter((p) => p.loanId === loanId).reduce((s, p) => s + p.amount, 0);
        if (paid >= loan.amount + loan.profit) {
          loan.status = "completed";
          completed = true;
        }
      }
    });
    setEditing(null);
    setToast(`✓ ${inr(final)} collected from ${name}`);
    setTimeout(() => setToast(null), 2500);
    if (completed) {
      const isCollector = session?.role === "collector";
      setTimeout(() => {
        if (isCollector) navigate({ to: "/receipt/customer/$loanId", params: { loanId } });
        else navigate({ to: "/receipt/$loanId", params: { loanId } });
      }, 600);
    }
  };

  const totalCollectedToday = data.emiPayments
    .filter((p) => isToday(p.date) && (!myCustomerIds || myCustomerIds.has(p.customerId)))
    .reduce((s, p) => s + p.amount, 0);
  const overdueCount = items.filter((i) => i.overdue).length;

  return (
    <AppShell title="EMI Collection">
      <div className="px-4 pt-4 animate-fade">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-4 shadow-card">
          <p className="text-xs opacity-80">Collected Today</p>
          <p className="text-2xl font-bold">{inr(totalCollectedToday)}</p>
          {overdueCount > 0 && (
            <p className="mt-1 text-[11px] bg-white/20 inline-block rounded-full px-2 py-0.5">
              ⚠ {overdueCount} overdue loan{overdueCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2.5 shadow-soft">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <div className="mt-4 space-y-2">
          {items.map(({ loan, cust, paidToday, remaining, overdue }) => {
            const emi = emiAmountOf(loan);
            const type = emiTypeOf(loan);
            const due = Math.max(0, emi - paidToday);
            const { percent } = loanProgress(loan, data.emiPayments);
            return (
              <div key={loan.id} className={`rounded-2xl p-3 shadow-soft border animate-pop ${overdue ? "border-destructive/40 bg-destructive/5" : "bg-card border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                      {cust?.name}
                      {overdue && <span className="text-[9px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 font-bold flex items-center gap-0.5"><AlertTriangle className="size-2.5" />OVERDUE</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{cust?.phone} · {type} EMI {inr(emi)} · Bal {inr(remaining)}</p>
                  </div>
                  {remaining === 0 ? (
                    <span className="text-xs bg-success/15 text-success rounded-full px-2 py-1 font-semibold flex items-center gap-1">
                      <Check className="size-3" /> Done
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setEditing({
                          loanId: loan.id,
                          customerId: loan.customerId,
                          name: cust?.name ?? "",
                          amount: String(due > 0 ? due : Math.min(emi, remaining)),
                          note: "",
                        })
                      }
                      className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap"
                    >
                      {due === 0 ? `Extra (${inr(remaining)})` : `Collect ${inr(due)}`}
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                {paidToday > 0 && (
                  <p className="mt-1 text-[10px] text-success">Paid today: {inr(paidToday)}</p>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No active loans found</p>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center animate-fade" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-5 shadow-card animate-sheet">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Collect from {editing.name}</h3>
              <button onClick={() => setEditing(null)} className="size-8 rounded-full bg-muted grid place-items-center"><X className="size-4" /></button>
            </div>
            {(() => {
              const item = items.find((i) => i.loan.id === editing.loanId);
              const max = item?.remaining ?? 0;
              const emi = item ? emiAmountOf(item.loan) : 0;
              return (
                <>
                  <label className="text-xs text-muted-foreground">Amount (₹) — any amount up to balance</label>
                  <input
                    type="number"
                    autoFocus
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-lg font-semibold outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[emi, emi * 2, emi * 4, max].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                      <button
                        key={v}
                        onClick={() => setEditing({ ...editing, amount: String(Math.min(v, max)) })}
                        className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground"
                      >
                        {v === max ? `Full ${inr(max)}` : inr(v)}
                      </button>
                    ))}
                  </div>
                  <label className="mt-3 block text-xs text-muted-foreground">Reason / Note (optional)</label>
                  <input
                    value={editing.note}
                    onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                    placeholder="e.g. paid 2 days together, partial payment"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">EMI {inr(emi)} · Balance {inr(max)}</p>
                  <button
                    onClick={() => submit(editing.loanId, editing.customerId, Number(editing.amount), editing.name, max, editing.note)}
                    className="mt-4 w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold"
                  >
                    Confirm Payment
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs rounded-full px-4 py-2 shadow-card z-40 max-w-[90%] text-center animate-pop">
          {toast}
        </div>
      )}
    </AppShell>
  );
}
