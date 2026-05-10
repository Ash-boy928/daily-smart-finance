import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, db, inr } from "@/lib/store";

export const Route = createFileRoute("/loans")({
  head: () => ({ meta: [{ title: "Loan Approvals — Smart Finance" }] }),
  component: Loans,
});

const tabs = ["pending", "approved", "rejected"] as const;
type Tab = typeof tabs[number];

function Loans() {
  const data = useDB();
  const [tab, setTab] = useState<Tab>("pending");
  const list = data.loans.filter((l) => l.status === tab);

  return (
    <AppShell title="Loan Approvals" showBack>
      <div className="px-4 pt-4">
        <div className="bg-card border border-border rounded-xl p-1 flex">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition ${
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
            return (
              <div key={loan.id} className="bg-card border border-border rounded-2xl p-3 shadow-soft">
                <div className="flex justify-between items-start">
                  <div>
                    <Link to="/customers/$id" params={{ id: loan.customerId }} className="font-semibold text-sm">
                      {cust?.name ?? "—"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {inr(loan.amount)} + {inr(loan.profit)} · {loan.durationDays}d · EMI {inr(loan.dailyEmi)}
                    </p>
                  </div>
                </div>
                {tab === "pending" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => db.update((dd) => { const l = dd.loans.find((x) => x.id === loan.id); if (l) { l.status = "approved"; l.startDate = Date.now(); } })}
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
    </AppShell>
  );
}
