import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, db, uid, inr } from "@/lib/store";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Smart Finance" }] }),
  component: Expenses,
});

function Expenses() {
  const data = useDB();
  const [category, setCategory] = useState("Office Rent");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const total = data.expenses.reduce((s, e) => s + e.amount, 0);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const a = Number(amount);
    if (!a) return;
    db.update((dd) => {
      dd.expenses.unshift({ id: uid(), category, amount: a, note, date: Date.now() });
    });
    setAmount("");
    setNote("");
  };

  return (
    <AppShell title="Expenses" showBack>
      <div className="px-4 pt-4">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-4 shadow-card">
          <p className="text-xs opacity-80">Total Expenses</p>
          <p className="text-2xl font-bold">{inr(total)}</p>
        </div>

        <form onSubmit={add} className="mt-4 bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft">
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none">
              {["Office Rent", "Salary", "Travel", "Utilities", "Stationery", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <button className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">Add Expense</button>
        </form>

        <h3 className="mt-5 mb-2 text-sm font-semibold">Recent</h3>
        <div className="space-y-2">
          {data.expenses.map((x) => (
            <div key={x.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-soft">
              <div className="flex-1">
                <p className="text-sm font-semibold">{x.category}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(x.date).toLocaleDateString()} · {x.note || "—"}</p>
              </div>
              <p className="text-sm font-bold text-destructive">- {inr(x.amount)}</p>
              <button
                onClick={() => db.update((dd) => { dd.expenses = dd.expenses.filter((e) => e.id !== x.id); })}
                className="text-muted-foreground"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {data.expenses.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No expenses yet</p>}
        </div>
      </div>
    </AppShell>
  );
}
