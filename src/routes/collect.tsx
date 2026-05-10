import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, useSession, db, uid, inr, loanProgress } from "@/lib/store";
import { Check, Search } from "lucide-react";

export const Route = createFileRoute("/collect")({
  head: () => ({ meta: [{ title: "EMI Collection — Smart Finance" }] }),
  component: Collect,
});

function Collect() {
  const data = useDB();
  const session = useSession();
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const today = new Date();
  const isToday = (ts: number) => new Date(ts).toDateString() === today.toDateString();

  const active = data.loans.filter((l) => l.status === "approved");
  const items = active
    .map((loan) => {
      const cust = data.customers.find((c) => c.id === loan.customerId);
      const paidToday = data.emiPayments.filter((p) => p.loanId === loan.id && isToday(p.date)).reduce((s, p) => s + p.amount, 0);
      return { loan, cust, paidToday };
    })
    .filter(({ cust }) => !q || cust?.name.toLowerCase().includes(q.toLowerCase()) || cust?.phone.includes(q));

  const collect = (loanId: string, customerId: string, amount: number, name: string) => {
    db.update((dd) => {
      dd.emiPayments.unshift({
        id: uid(),
        loanId,
        customerId,
        amount,
        date: Date.now(),
        collectorUsername: session?.username ?? "unknown",
      });
    });
    setToast(`✓ ${inr(amount)} collected from ${name}. SMS will be sent (when SMS is enabled).`);
    setTimeout(() => setToast(null), 2800);
  };

  const totalCollectedToday = data.emiPayments.filter((p) => isToday(p.date)).reduce((s, p) => s + p.amount, 0);

  return (
    <AppShell title="EMI Collection">
      <div className="px-4 pt-4">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-4 shadow-card">
          <p className="text-xs opacity-80">Collected Today</p>
          <p className="text-2xl font-bold">{inr(totalCollectedToday)}</p>
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
          {items.map(({ loan, cust, paidToday }) => {
            const due = Math.max(0, loan.dailyEmi - paidToday);
            const { percent } = loanProgress(loan, data.emiPayments);
            return (
              <div key={loan.id} className="bg-card border border-border rounded-2xl p-3 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{cust?.name}</p>
                    <p className="text-[11px] text-muted-foreground">{cust?.phone} · EMI {inr(loan.dailyEmi)}</p>
                  </div>
                  {due === 0 ? (
                    <span className="text-xs bg-success/15 text-success rounded-full px-2 py-1 font-semibold flex items-center gap-1">
                      <Check className="size-3" /> Paid
                    </span>
                  ) : (
                    <button
                      onClick={() => collect(loan.id, loan.customerId, due, cust?.name ?? "")}
                      className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      Collect {inr(due)}
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No active loans found</p>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs rounded-full px-4 py-2 shadow-card z-40 max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </AppShell>
  );
}
