import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, useSession, db, uid, loanProgress, inr } from "@/lib/store";
import { Phone, MapPin, PlusCircle, IndianRupee, PiggyBank } from "lucide-react";

export const Route = createFileRoute("/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — Smart Finance" }] }),
  component: CustomerDetail,
  notFoundComponent: () => <div className="p-6 text-center">Customer not found</div>,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const data = useDB();
  const session = useSession();
  const navigate = useNavigate();
  const customer = data.customers.find((c) => c.id === id);
  const loans = data.loans.filter((l) => l.customerId === id);
  const savings = data.savings.filter((s) => s.customerId === id);

  const [showLoan, setShowLoan] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [profit, setProfit] = useState("2000");
  const [duration, setDuration] = useState("120");

  const [showSaving, setShowSaving] = useState(false);
  const [savingAmt, setSavingAmt] = useState("");

  if (!customer) return <AppShell title="Not found" showBack><div className="p-6">Customer not found</div></AppShell>;

  const requestLoan = () => {
    const a = Number(amount), p = Number(profit), d = Number(duration);
    if (!a || !d) return;
    db.update((dd) => {
      dd.loans.unshift({
        id: uid(),
        customerId: id,
        amount: a,
        profit: p,
        durationDays: d,
        dailyEmi: Math.ceil((a + p) / d),
        status: session?.role === "owner" ? "approved" : "pending",
        startDate: session?.role === "owner" ? Date.now() : undefined,
        createdAt: Date.now(),
      });
    });
    setShowLoan(false);
  };

  const addSaving = () => {
    const a = Number(savingAmt);
    if (!a) return;
    db.update((dd) => {
      dd.savings.unshift({ id: uid(), customerId: id, amount: a, date: Date.now() });
    });
    setSavingAmt("");
    setShowSaving(false);
  };

  const totalSavings = savings.reduce((s, x) => s + x.amount, 0);

  return (
    <AppShell title={customer.name} showBack>
      <div className="px-4 pt-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-full bg-primary/10 text-primary grid place-items-center text-xl font-bold">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{customer.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="size-3" /> {customer.phone}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {customer.address || "—"}</p>
            </div>
          </div>
          {customer.aadhaarPhoto && (
            <div className="mt-3">
              <p className="text-[11px] text-muted-foreground mb-1">Aadhaar</p>
              <img src={customer.aadhaarPhoto} alt="Aadhaar" className="rounded-xl max-h-44 w-full object-contain bg-muted" />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-accent rounded-2xl p-3">
            <p className="text-xs text-accent-foreground/70">Total Savings</p>
            <p className="text-lg font-bold text-accent-foreground">{inr(totalSavings)}</p>
          </div>
          <div className="bg-primary text-primary-foreground rounded-2xl p-3">
            <p className="text-xs opacity-80">Active Loan</p>
            <p className="text-lg font-bold">
              {inr(loans.find((l) => l.status === "approved")?.amount ?? 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setShowLoan((v) => !v)} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1">
            <PlusCircle className="size-4" /> New Loan
          </button>
          <button onClick={() => setShowSaving((v) => !v)} className="flex-1 bg-card border border-border rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1">
            <PiggyBank className="size-4" /> Add Saving
          </button>
        </div>

        {showLoan && (
          <div className="mt-3 bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft">
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Amount" value={amount} onChange={setAmount} />
              <Mini label="Profit" value={profit} onChange={setProfit} />
              <Mini label="Days" value={duration} onChange={setDuration} />
            </div>
            <div className="text-xs text-muted-foreground">
              Daily EMI: <span className="font-semibold text-foreground">{inr(Math.ceil((Number(amount) + Number(profit)) / Number(duration || 1)))}</span>
            </div>
            <button onClick={requestLoan} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">
              {session?.role === "owner" ? "Approve & Issue Loan" : "Request Approval"}
            </button>
          </div>
        )}

        {showSaving && (
          <div className="mt-3 bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft">
            <Mini label="Saving Amount (₹)" value={savingAmt} onChange={setSavingAmt} />
            <button onClick={addSaving} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">
              Save
            </button>
          </div>
        )}

        <h3 className="mt-5 mb-2 text-sm font-semibold">Loans</h3>
        <div className="space-y-2">
          {loans.length === 0 && <p className="text-sm text-muted-foreground">No loans yet.</p>}
          {loans.map((loan) => {
            const { paid, totalDue, daysPaid, percent } = loanProgress(loan, data.emiPayments);
            return (
              <div key={loan.id} className="bg-card border border-border rounded-2xl p-3 shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{inr(loan.amount)} <span className="text-muted-foreground font-normal">+ {inr(loan.profit)} profit</span></p>
                    <p className="text-[11px] text-muted-foreground">{loan.durationDays} days · EMI {inr(loan.dailyEmi)}</p>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>Paid {inr(paid)} / {inr(totalDue)}</span>
                  <span>{daysPaid}/{loan.durationDays} days</span>
                </div>
                {loan.status === "approved" && (
                  <button
                    onClick={() => navigate({ to: "/collect", search: { loan: loan.id } as never })}
                    className="mt-3 w-full bg-success text-success-foreground rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <IndianRupee className="size-4" /> Collect EMI
                  </button>
                )}
                {loan.status === "pending" && session?.role === "owner" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => db.update((dd) => { const ll = dd.loans.find((x) => x.id === loan.id); if (ll) { ll.status = "approved"; ll.startDate = Date.now(); } })}
                      className="bg-success text-success-foreground rounded-xl py-2 text-sm font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => db.update((dd) => { const ll = dd.loans.find((x) => x.id === loan.id); if (ll) ll.status = "rejected"; })}
                      className="bg-destructive text-destructive-foreground rounded-xl py-2 text-sm font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {savings.length > 0 && (
          <>
            <h3 className="mt-5 mb-2 text-sm font-semibold">Savings History</h3>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
              {savings.map((s) => (
                <div key={s.id} className="flex justify-between items-center p-3 text-sm">
                  <span>{new Date(s.date).toLocaleDateString()}</span>
                  <span className="font-semibold text-success">+ {inr(s.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <Link to="/loans" className="block mt-6 text-center text-xs text-primary">View all loans →</Link>
      </div>
    </AppShell>
  );
}

function Mini({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-2 text-sm outline-none"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-success/15 text-success",
    pending: "bg-warning/20 text-warning-foreground",
    rejected: "bg-destructive/15 text-destructive",
    completed: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${styles[status] ?? ""}`}>{status}</span>;
}
