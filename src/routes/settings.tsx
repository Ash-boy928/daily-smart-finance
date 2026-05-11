import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useSession, setSession } from "@/lib/store";
import { ChevronRight, Receipt, PiggyBank, ClipboardCheck, Database, Bell, Info, LogOut, FileBarChart, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Smart Finance" }] }),
  component: Settings,
});

function Settings() {
  const session = useSession();
  const navigate = useNavigate();
  const isOwner = session?.role === "owner";

  return (
    <AppShell title="Settings">
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-soft">
          <div className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-lg">
            {session?.name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{session?.name}</p>
            <p className="text-xs text-muted-foreground">{isOwner ? "Owner / Admin" : "Loan Collector"}</p>
          </div>
        </div>

        <Group>
          <Item to="/customers" icon={<Users className="size-4" />} label="All Customers" />
          {isOwner && <Item to="/loans" icon={<ClipboardCheck className="size-4" />} label="Loan Approvals" />}
          <Item to="/savings" icon={<PiggyBank className="size-4" />} label="Savings" />
          {isOwner && <Item to="/profit" icon={<TrendingUp className="size-4" />} label="Profit Dashboard" />}
          {isOwner && <Item to="/expenses" icon={<Receipt className="size-4" />} label="Expense Management" />}
          {isOwner && <Item to="/reports" icon={<FileBarChart className="size-4" />} label="Reports & Export" />}
        </Group>

        <Group>
          <Row icon={<Bell className="size-4" />} label="SMS Notifications" right={<span className="text-xs text-muted-foreground">Setup later</span>} />
          <Row icon={<Database className="size-4" />} label="Offline data sync" right={<span className="text-xs text-success">Local</span>} />
          <Row icon={<Info className="size-4" />} label="About" right={<span className="text-xs text-muted-foreground">v1.0</span>} />
        </Group>

        <button
          onClick={() => { setSession(null); navigate({ to: "/login" }); }}
          className="w-full flex items-center justify-center gap-2 bg-card border border-destructive/30 text-destructive rounded-2xl py-3 text-sm font-semibold"
        >
          <LogOut className="size-4" /> Logout
        </button>

        <p className="text-center text-[11px] text-muted-foreground pt-2 pb-4">
          Smart Finance · Microfinance & Daily Collection
        </p>
      </div>
    </AppShell>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-2xl divide-y divide-border shadow-soft overflow-hidden">{children}</div>;
}
function Item({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 text-sm active:bg-muted">
      <span className="text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
function Row({ icon, label, right }: { icon: React.ReactNode; label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      {right}
    </div>
  );
}
