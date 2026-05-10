import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, db, uid, inr, MIN_LOANABLE } from "@/lib/store";
import { PiggyBank, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/savings")({
  head: () => ({ meta: [{ title: "Daily Savings — Smart Finance" }] }),
  component: Savings,
});

function Savings() {
  const data = useDB();
  const [adding, setAdding] = useState<string | null>(null); // customerId
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<"all" | "ready" | "history">("all");

  const totals = useMemo(
    () =>
      data.customers
        .map((c) => {
          const list = data.savings.filter((s) => s.customerId === c.id).sort((a, b) => b.date - a.date);
          const total = list.reduce((s, x) => s + x.amount, 0);
          return { ...c, total, list };
        })
        .sort((a, b) => b.total - a.total),
    [data]
  );

  const grand = totals.reduce((s, c) => s + c.total, 0);
  const readyCount = totals.filter((c) => c.total >= MIN_LOANABLE).length;

  const save = () => {
    const a = Number(amount);
    if (!a || !adding) return;
    const ts = new Date(date).getTime() || Date.now();
    db.update((dd) => {
      dd.savings.unshift({ id: uid(), customerId: adding, amount: a, date: ts });
    });
    setAmount("");
    setAdding(null);
  };

  const view = tab === "ready" ? totals.filter((c) => c.total >= MIN_LOANABLE) : totals;

  return (
    <AppShell title="Daily Savings" showBack>
      <div className="px-4 pt-4">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-4 shadow-card">
          <p className="text-xs opacity-80">Total Savings Pool</p>
          <p className="text-2xl font-bold">{inr(grand)}</p>
          <p className="mt-1 text-[11px] opacity-80">
            {readyCount} customer{readyCount === 1 ? "" : "s"} ready to lend (≥ {inr(MIN_LOANABLE)})
          </p>
        </div>

        <div className="mt-4 flex gap-1 bg-muted rounded-xl p-1">
          {(["all", "ready", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg ${tab === t ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            >
              {t === "all" ? "All" : t === "ready" ? "Ready to Lend" : "History"}
            </button>
          ))}
        </div>

        {tab !== "history" && (
          <div className="mt-3 space-y-2">
            {view.map((c) => {
              const ready = c.total >= MIN_LOANABLE;
              return (
                <div
                  key={c.id}
                  className={`rounded-2xl p-3 shadow-soft border ${
                    ready
                      ? "bg-accent border-primary/30 ring-1 ring-primary/40"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <Link to="/customers/$id" params={{ id: c.id }} className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate flex items-center gap-1">
                        {c.name}
                        {ready && <Sparkles className="size-3 text-primary" />}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.phone} · {c.list.length} deposit{c.list.length === 1 ? "" : "s"}
                      </p>
                    </Link>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${ready ? "text-primary" : "text-success"}`}>{inr(c.total)}</p>
                      <button
                        onClick={() => {
                          setAdding(c.id);
                          setAmount("");
                          setDate(new Date().toISOString().slice(0, 10));
                        }}
                        className="mt-1 text-[11px] bg-primary text-primary-foreground rounded-full px-2.5 py-1 font-semibold inline-flex items-center gap-1"
                      >
                        <PiggyBank className="size-3" /> Add
                      </button>
                    </div>
                  </div>
                  {ready && (
                    <p className="mt-2 text-[10px] font-medium text-primary">
                      ✦ Eligible to lend this saving as a loan to another customer
                    </p>
                  )}
                </div>
              );
            })}
            {view.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No customers here yet</p>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="mt-3 bg-card border border-border rounded-2xl divide-y divide-border">
            {data.savings.length === 0 && (
              <p className="text-center text-sm text-muted-foreground p-6">No savings yet</p>
            )}
            {data.savings
              .slice()
              .sort((a, b) => b.date - a.date)
              .map((s) => {
                const c = data.customers.find((x) => x.id === s.customerId);
                return (
                  <div key={s.id} className="flex justify-between items-center p-3 text-sm">
                    <div>
                      <p className="font-medium">{c?.name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(s.date).toLocaleDateString()}</p>
                    </div>
                    <span className="font-semibold text-success">+ {inr(s.amount)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center" onClick={() => setAdding(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">
                Add Saving — {data.customers.find((c) => c.id === adding)?.name}
              </h3>
              <button onClick={() => setAdding(null)} className="size-8 rounded-full bg-muted grid place-items-center">
                <X className="size-4" />
              </button>
            </div>
            <label className="text-xs text-muted-foreground">Amount (₹)</label>
            <input
              type="number"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-3 text-lg font-semibold outline-none"
            />
            <label className="mt-3 block text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none"
            />
            <button onClick={save} className="mt-4 w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold">
              Save Deposit
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
