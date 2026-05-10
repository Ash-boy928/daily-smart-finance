import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, inr } from "@/lib/store";

export const Route = createFileRoute("/savings")({
  head: () => ({ meta: [{ title: "Daily Savings — Smart Finance" }] }),
  component: Savings,
});

function Savings() {
  const data = useDB();
  const totals = data.customers.map((c) => {
    const total = data.savings.filter((s) => s.customerId === c.id).reduce((s, x) => s + x.amount, 0);
    return { ...c, total };
  });
  const grand = totals.reduce((s, c) => s + c.total, 0);

  return (
    <AppShell title="Daily Savings" showBack>
      <div className="px-4 pt-4">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-4 shadow-card">
          <p className="text-xs opacity-80">Total Savings Pool</p>
          <p className="text-2xl font-bold">{inr(grand)}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Tap a customer to add a saving deposit.</p>
        <div className="mt-2 space-y-2">
          {totals.map((c) => (
            <Link key={c.id} to="/customers/$id" params={{ id: c.id }} className="flex justify-between items-center bg-card border border-border rounded-2xl p-3 shadow-soft">
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.phone}</p>
              </div>
              <p className="text-sm font-bold text-success">{inr(c.total)}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
