import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { db, uid } from "@/lib/store";
import { Camera, Upload } from "lucide-react";

export const Route = createFileRoute("/customers/new")({
  head: () => ({ meta: [{ title: "Add Customer — Smart Finance" }] }),
  component: AddCustomer,
});

function AddCustomer() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [aadhaar, setAadhaar] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAadhaar(String(reader.result));
    reader.readAsDataURL(f);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    const id = uid();
    db.update((d) => {
      d.customers.unshift({ id, name, phone, address, aadhaarPhoto: aadhaar, createdAt: Date.now() });
    });
    navigate({ to: "/customers/$id", params: { id } });
  };

  return (
    <AppShell title="Add Customer" showBack>
      <form onSubmit={submit} className="px-4 pt-4 space-y-4">
        <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. Anita Sharma" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="10-digit mobile" type="tel" />
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
            {aadhaar ? (
              <img src={aadhaar} alt="Aadhaar" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <div className="size-12 rounded-full bg-primary/10 text-primary grid place-items-center">
                  <Camera className="size-5" />
                </div>
                <span className="text-sm">Take photo or upload</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Upload className="size-3" /> JPG / PNG
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

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-card active:scale-[0.99]"
        >
          Save Customer
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
