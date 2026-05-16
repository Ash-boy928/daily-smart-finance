import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, inr, loanProgress, emiAmountOf, emiTypeOf } from "@/lib/store";
import { Printer, Share2 } from "lucide-react";

export const Route = createFileRoute("/receipt/$loanId")({
  head: () => ({ meta: [{ title: "Loan Receipt — Smart Finance" }] }),
  component: Receipt,
  notFoundComponent: () => <div className="p-6">Loan not found</div>,
});

function Receipt() {
  const { loanId } = Route.useParams();
  const data = useDB();
  const loan = data.loans.find((l) => l.id === loanId);
  if (!loan) return <AppShell title="Receipt" showBack><div className="p-6">Not found</div></AppShell>;
  const customer = data.customers.find((c) => c.id === loan.customerId);
  const pr = loanProgress(loan, data.emiPayments);
  const payments = data.emiPayments.filter((p) => p.loanId === loan.id).sort((a, b) => a.date - b.date);

  const share = async () => {
    const text = `Loan Closure Receipt
Customer: ${customer?.name}
Loan: ${inr(loan.amount)} + Profit ${inr(loan.profit)}
Total paid: ${inr(pr.paid)}
Status: ${loan.status.toUpperCase()}
Period: ${loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "—"} to ${new Date().toLocaleDateString()}
— Smart Finance`;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: "Loan Receipt", text });
      } catch {/* cancelled */}
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Receipt copied to clipboard");
    }
  };

  return (
    <AppShell title="Loan Receipt" showBack>
      <div className="px-4 pt-4 animate-fade">
        <div id="receipt" className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-center pb-3 border-b border-dashed border-border">
            <p className="font-bold text-lg">Smart Finance</p>
            <p className="text-[11px] text-muted-foreground">Loan Closure Receipt</p>
          </div>
          <dl className="mt-3 text-sm space-y-1.5">
            <Row label="Customer" v={customer?.name ?? "—"} />
            <Row label="Phone" v={customer?.phone ?? "—"} />
            <Row label="Loan ID" v={loan.id} />
            <Row label="Loan amount" v={inr(loan.amount)} />
            <Row label="Profit" v={inr(loan.profit)} />
            <Row label="Total payable" v={inr(loan.amount + loan.profit)} />
            <Row label="EMI" v={`${inr(emiAmountOf(loan))} (${emiTypeOf(loan)})`} />
            <Row label="Duration" v={`${loan.durationDays} days`} />
            <Row label="Started" v={loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "—"} />
            <Row label="Closed" v={new Date().toLocaleDateString()} />
            <Row label="Total collected" v={inr(pr.paid)} bold />
            <Row label="Profit earned" v={inr(pr.realizedProfit)} bold />
          </dl>

          <div className="mt-4 pt-3 border-t border-dashed border-border">
            <p className="text-xs font-semibold mb-2">Payment history ({payments.length})</p>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>{new Date(p.date).toLocaleDateString()}</span>
                  <span className="font-semibold">{inr(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">Thank you for your business 🌱</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => window.print()} className="bg-card border border-border rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1">
            <Printer className="size-4" /> Print
          </button>
          <button onClick={share} className="bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1">
            <Share2 className="size-4" /> Share
          </button>
        </div>
        <Link to="/receipt/customer/$loanId" params={{ loanId: loan.id }} className="block mt-2 text-center text-xs font-semibold bg-accent rounded-xl py-2.5">
          📄 Open Customer Copy (no profit)
        </Link>
        <Link to="/reports" className="block mt-3 text-center text-xs text-primary">← Back to Reports</Link>
      </div>
    </AppShell>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "font-bold" : "font-medium"}>{v}</dd>
    </div>
  );
}
