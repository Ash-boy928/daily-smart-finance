import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSession, setSession, useDB, db, compressImage } from "@/lib/store";
import { ChevronRight, Receipt, PiggyBank, ClipboardCheck, Database, Bell, Info, LogOut, FileBarChart, TrendingUp, Users, UserPlus, X, Camera } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Smart Finance" }] }),
  component: Settings,
});

function Settings() {
  const session = useSession();
  const data = useDB();
  const navigate = useNavigate();
  const isOwner = session?.role === "owner";
  const [showCollector, setShowCollector] = useState(false);

  return (
    <AppShell title="Settings">
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-soft">
          <div className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-lg">
            {session?.name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{session?.name}</p>
            <p className="text-xs text-muted-foreground">{isOwner ? "Admin" : "Loan Collector"}</p>
          </div>
        </div>

        {isOwner && (
          <Group>
            <button onClick={() => setShowCollector(true)} className="w-full flex items-center gap-3 px-4 py-3 text-sm active:bg-muted">
              <span className="text-primary"><UserPlus className="size-4" /></span>
              <span className="flex-1 text-left">Create Collector Account</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            {data.collectorAccounts.map((collector) => {
              const assigned = data.customers.filter((c) => c.collectorUsername === collector.username);
              return (
                <Link
                  key={collector.username}
                  to="/collectors/$username"
                  params={{ username: collector.username }}
                  className="flex items-center gap-3 px-4 py-3 text-sm active:bg-muted"
                >
                  {collector.photo ? (
                    <img src={collector.photo} alt={collector.name} className="size-10 rounded-full object-cover" />
                  ) : (
                    <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                      {collector.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{collector.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{collector.username} · {assigned.length} customers</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </Group>
        )}

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
      {showCollector && <CollectorModal close={() => setShowCollector(false)} />}
    </AppShell>
  );
}

function CollectorModal({ close }: { close: () => void }) {
  const data = useDB();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("collect123");
  const [photo, setPhoto] = useState<string | undefined>();
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await compressImage(f, 400, 0.7);
      setPhoto(dataUrl);
    } catch {
      setErr("Could not load photo");
    }
  };

  const save = () => {
    setErr("");
    const user = username.trim().toLowerCase();
    if (!name.trim() || !user || !password.trim()) return setErr("Name, username and password required");
    if (user === "owner" || data.collectorAccounts.some((c) => c.username === user)) return setErr("Username already exists");
    db.update((d) => {
      d.collectorAccounts.push({ username: user, password: password.trim(), name: name.trim(), photo, createdAt: Date.now() });
    });
    close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center animate-fade" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-5 shadow-card animate-sheet">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Create Collector</h3>
          <button onClick={close} className="size-8 rounded-full bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="size-16 rounded-full bg-muted grid place-items-center overflow-hidden border border-border active:scale-95 shrink-0"
            >
              {photo ? <img src={photo} alt="collector" className="size-full object-cover" /> : <Camera className="size-5 text-muted-foreground" />}
            </button>
            <div className="text-xs text-muted-foreground">Tap to add collector photo (optional)</div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
          </div>
          <Input label="Collector Name" value={name} onChange={setName} />
          <Input label="Username" value={username} onChange={setUsername} />
          <Input label="Password" value={password} onChange={setPassword} />
          {err && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">{err}</p>}
          <button onClick={save} className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold">Save Collector</button>
        </div>
      </div>
    </div>
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

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
      />
    </div>
  );
}
