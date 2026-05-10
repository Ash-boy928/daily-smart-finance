import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, inr } from "@/lib/store";
import { Plus, Search, Phone } from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — Smart Finance" }] }),
  component: Customers,
});

function Customers() {
  const db = useDB();
  const [q, setQ] = useState("");
  const filtered = db.customers.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q),
  );

  return (
    <AppShell
      title="Customers"
      right={
        <Link to="/customers/new" aria-label="Add" className="size-9 rounded-full bg-white/20 grid place-items-center">
          <Plus className="size-5" />
        </Link>
      }
    >
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2.5 shadow-soft">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or phone"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {filtered.map((c) => {
          const loans = db.loans.filter((l) => l.customerId === c.id);
          const active = loans.find((l) => l.status === "approved");
          return (
            <Link
              key={c.id}
              to="/customers/$id"
              params={{ id: c.id }}
              className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-soft active:scale-[0.99]"
            >
              <div className="size-11 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="size-3" /> {c.phone}
                </p>
              </div>
              <div className="text-right">
                {active ? (
                  <>
                    <p className="text-sm font-semibold text-primary">{inr(active.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">Active loan</p>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground">No active loan</span>
                )}
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">No customers found</div>
        )}
      </div>
    </AppShell>
  );
}
