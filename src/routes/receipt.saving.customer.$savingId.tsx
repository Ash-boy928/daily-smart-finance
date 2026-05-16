import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, inr, savingsBalance, shortSavingId } from "@/lib/store";
import { Printer, Share2 } from "lucide-react";

export const Route = createFileRoute("/receipt/saving/customer/$savingId")({
  head: () => ({ meta: [{ title: "Saving Receipt — Smart Finance" }] }),
  component: SavingCustomerReceipt,
  notFoundComponent: () => <div className="p-6">Transaction not found</div>,
});

function SavingCustomerReceipt() {
  const { savingId } = Route.useParams();
  const data = useDB();
  const s = data.savings.find((x) => x.id === savingId);
  if (!s) return <AppShell title="Receipt" showBack><div className="p-6">Not found</div></AppShell>;
  const customer = data.customers.find((c) => c.id === s.customerId);
  const balanceAfter = savingsBalance(s.customerId, data.savings);
  const isWithdraw = s.type === "withdrawal";

  const share = async () => {
    const text = `Smart Finance — Saving ${isWithdraw ? "Withdrawal" : "Deposit"} (Customer Copy)
Receipt ID: ${shortSavingId(s.id)}
Customer: ${customer?.name}
Date: ${new Date(s.date).toLocaleString()}
Amount: ${isWithdraw ? "-" : "+"}${inr(s.amount)}
Balance: ${inr(balanceAfter)}
Thank you 🙏`;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: "Saving Receipt", text }); } catch { /* cancelled */ } }
    else if (navigator.clipboard) { navigator.clipboard.writeText(text); alert("Receipt copied"); }
  };

  return (
    <AppShell title={isWithdraw ? "Withdrawal Receipt" : "Deposit Receipt"} showBack>
      <div className="px-4 pt-4 animate-fade">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-center pb-3 border-b border-dashed border-border">
            <p className="font-bold text-lg">Smart Finance</p>
            <p className="text-[11px] text-muted-foreground">Saving {isWithdraw ? "Withdrawal" : "Deposit"} — Customer Copy</p>
          </div>
          <dl className="mt-3 text-sm space-y-1.5">
            <Row label="Receipt ID" v={shortSavingId(s.id)} />
            <Row label="Customer" v={customer?.name ?? "—"} />
            <Row label="Phone" v={customer?.phone ?? "—"} />
            <Row label="Date" v={new Date(s.date).toLocaleString()} />
            <Row label="Type" v={isWithdraw ? "Withdrawal" : "Deposit"} />
            <Row label="Amount" v={`${isWithdraw ? "-" : "+"}${inr(s.amount)}`} bold />
            <Row label="Balance" v={inr(balanceAfter)} bold />
            {s.note && <Row label="Note" v={s.note} />}
          </dl>
          <p className="mt-4 text-center text-[10px] text-muted-foreground">Thank you 🙏 — Customer Copy</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => window.print()} className="bg-card border border-border rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1">
            <Printer className="size-4" /> Print
          </button>
          <button onClick={share} className="bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1">
            <Share2 className="size-4" /> Share
          </button>
        </div>
        <Link to="/savings" className="block mt-3 text-center text-xs text-primary">← Back to Savings</Link>
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
