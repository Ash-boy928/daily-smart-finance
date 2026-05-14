import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { db, uid, compressImage, calcEmi, useSession, type EmiType, inr } from "@/lib/store";
import { Camera, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/customers/new")({
  head: () => ({ meta: [{ title: "Add Customer — Smart Finance" }] }),
  component: AddCustomer,
});

function AddCustomer() {
  const navigate = useNavigate();
  const session = useSession();
  const data = db.get();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [aadhaar, setAadhaar] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [giveLoan, setGiveLoan] = useState(false);
  const [amount, setAmount] = useState("10000");
  const [profit, setProfit] = useState("2000");
  const [duration, setDuration] = useState("120");
  const [emiType, setEmiType] = useState<EmiType>("daily");
  const [collectorUsername, setCollectorUsername] = useState(
    session?.role === "collector" ? session.username : (data.collectorAccounts[0]?.username ?? "collector")
  );

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const data = await compressImage(f, 800, 0.7);
      setAadhaar(data);
    } catch {
      setErr("Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Name required");
    if (!phone.trim() || phone.trim().length < 7) return setErr("Valid phone required");
    const id = uid();
    try {
      db.update((d) => {
        d.customers.unshift({
          id,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          aadhaarPhoto: aadhaar,
          collectorUsername: collectorUsername || undefined,
          createdAt: Date.now(),
        });
        if (giveLoan) {
          const a = Number(amount), p = Number(profit), dur = Number(duration);
          if (a > 0 && dur > 0) {
            const emi = calcEmi(a, p, dur, emiType);
            const start = Date.now();
            d.loans.unshift({
              id: uid(),
              customerId: id,
              amount: a,
              investedAmount: a,
              profit: p,
              durationDays: dur,
              emiType,
              dailyEmi: emi,
              emiAmount: emi,
              status: session?.role === "owner" ? "approved" : "pending",
              startDate: session?.role === "owner" ? start : undefined,
              endDate: session?.role === "owner" ? start + dur * 86400000 : undefined,
              createdAt: Date.now(),
            });
          }
        }
      });
      navigate({ to: "/customers/$id", params: { id } });
    } catch (e) {
      setErr("Failed to save. " + (e instanceof Error ? e.message : ""));
    }
  };

  const emi = calcEmi(Number(amount) || 0, Number(profit) || 0, Number(duration) || 1, emiType);

  return (
    <AppShell title="Add Customer" showBack>
      <form onSubmit={submit} className="px-4 pt-4 space-y-4 animate-fade">
        <Field label="Full Name *" value={name} onChange={setName} placeholder="e.g. Anita Sharma" />
        <Field label="Phone *" value={phone} onChange={setPhone} placeholder="10-digit mobile" type="tel" />
        {session?.role === "owner" && data.collectorAccounts.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Assign Collector</label>
            <select
              value={collectorUsername}
              onChange={(e) => setCollectorUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
            >
              {data.collectorAccounts.map((c) => (
                <option key={c.username} value={c.username}>{c.name} ({c.username})</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
            placeholder="House, street, city"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Aadhaar Photo</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-1 w-full rounded-xl border border-dashed border-border bg-card p-4 flex flex-col items-center gap-2 active:scale-[0.99]"
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : aadhaar ? (
              <img src={aadhaar} alt="Aadhaar" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <div className="size-12 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <Camera className="size-5" />
                </div>
                <span className="text-sm">Take photo or upload</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Upload className="size-3" /> JPG / PNG (auto-compressed)
                </span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <label className="flex items-center gap-2 bg-accent/50 rounded-xl p-3 cursor-pointer">
          <input type="checkbox" checked={giveLoan} onChange={(e) => setGiveLoan(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
          <span className="text-sm font-medium">Issue a loan to this customer now</span>
        </label>

        {giveLoan && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft animate-pop">
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
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>EMI {emiType}: <span className="font-semibold text-foreground">{inr(emi)}</span></span>
              <span>Total: <span className="font-semibold text-foreground">{inr(Number(amount) + Number(profit))}</span></span>
            </div>
          </div>
        )}

        {err && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-card active:scale-[0.99] disabled:opacity-60"
        >
          {giveLoan ? "Save Customer & Issue Loan" : "Save Customer"}
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
      />
    </div>
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
