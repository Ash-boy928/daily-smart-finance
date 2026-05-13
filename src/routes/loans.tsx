import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, db, inr, calcEmi, emiAmountOf, emiTypeOf, type EmiType } from "@/lib/store";
import { X } from "lucide-react";

export const Route = createFileRoute("/loans")({
  head: () => ({ meta: [{ title: "Loan Approvals — Smart Finance" }] }),
  component: Loans,
});

const tabs = ["pending", "approved", "rejected", "completed"] as const;
type Tab = typeof tabs[number];

function Loans() {
  const data = useDB();
  const [tab, setTab] = useState<Tab>("pending");
  const [editing, setEditing] = useState<string | null>(null);
  const list = data.loans.filter((l) => l.status === tab);

  return (
    <AppShell title="Loan Approvals" showBack>
      <div className="px-4 pt-4 animate-fade">
        <div className="bg-card border border-border rounded-xl p-1 flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition whitespace-nowrap ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {list.map((loan) => {
            const cust = data.customers.find((c) => c.id === loan.customerId);
            const emi = emiAmountOf(loan);
            const type = emiTypeOf(loan);
            return (
              <div key={loan.id} className="bg-card border border-border rounded-2xl p-3 shadow-soft animate-pop">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <Link to="/customers/$id" params={{ id: loan.customerId }} className="font-semibold text-sm truncate block">
                      {cust?.name ?? "—"}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      Loan {inr(loan.amount)} + Profit {inr(loan.profit)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {loan.durationDays}d · {type} EMI {inr(emi)}
                      {loan.startDate && ` · starts ${new Date(loan.startDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                {tab === "pending" && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setEditing(loan.id)}
                      className="bg-card border border-border rounded-xl py-2 text-sm font-semibold col-span-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        db.update((dd) => {
                          const l = dd.loans.find((x) => x.id === loan.id);
                          if (l) {
                            l.status = "approved";
                            l.startDate = Date.now();
                            l.endDate = Date.now() + l.durationDays * 86400000;
                          }
                        })
                      }
                      className="bg-success text-success-foreground rounded-xl py-2 text-sm font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => db.update((dd) => { const l = dd.loans.find((x) => x.id === loan.id); if (l) l.status = "rejected"; })}
                      className="bg-destructive text-destructive-foreground rounded-xl py-2 text-sm font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No {tab} loans</p>}
        </div>
      </div>

      {editing && <EditModal loanId={editing} close={() => setEditing(null)} />}
    </AppShell>
  );
}

function EditModal({ loanId, close }: { loanId: string; close: () => void }) {
  const data = useDB();
  const loan = data.loans.find((l) => l.id === loanId)!;
  const [amount, setAmount] = useState(String(loan.amount));
  const [profit, setProfit] = useState(String(loan.profit));
  const [duration, setDuration] = useState(String(loan.durationDays));
  const [emiType, setEmiType] = useState<EmiType>(emiTypeOf(loan));
  const [start, setStart] = useState(() => new Date(loan.startDate ?? Date.now()).toISOString().slice(0, 10));

  const a = Number(amount), p = Number(profit), d = Number(duration);
  const emi = calcEmi(a || 0, p || 0, d || 1, emiType);
  const startMs = new Date(start).getTime();
  const endMs = startMs + (d || 0) * 86400000;

  const save = (approve: boolean) => {
    db.update((dd) => {
      const l = dd.loans.find((x) => x.id === loanId);
      if (!l) return;
      l.investedAmount = a;
      l.amount = a;
      l.profit = p;
      l.durationDays = d;
      l.emiType = emiType;
      l.dailyEmi = emi;
      l.emiAmount = emi;
      l.startDate = startMs;
      l.endDate = endMs;
      if (approve) l.status = "approved";
    });
    close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center animate-fade" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-5 shadow-card animate-sheet max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Approve Loan</h3>
          <button onClick={close} className="size-8 rounded-full bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Mini label="Loan amount (₹)" value={amount} onChange={setAmount} />
            <Mini label="Profit (₹)" value={profit} onChange={setProfit} />
            <Mini label="Duration (days)" value={duration} onChange={setDuration} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">EMI Type</label>
            <div className="mt-1 flex gap-1 bg-muted rounded-xl p-1">
              {(["daily", "weekly", "monthly"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setEmiType(t)} className={`flex-1 text-xs font-semibold py-2 rounded-lg capitalize ${emiType === t ? "bg-card shadow-soft" : "text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Start Date</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none" />
          </div>
          <div className="bg-accent rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Total payable</span><span className="font-semibold">{inr(a + p)}</span></div>
            <div className="flex justify-between"><span>{emiType} EMI</span><span className="font-semibold">{inr(emi)}</span></div>
            <div className="flex justify-between"><span>End date</span><span className="font-semibold">{new Date(endMs).toLocaleDateString()}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => save(false)} className="bg-card border border-border rounded-xl py-2.5 text-sm font-semibold">Save Draft</button>
            <button onClick={() => save(true)} className="bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">Save & Approve</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none" />
    </div>
  );
}
