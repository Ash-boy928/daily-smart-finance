import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, useSession, db, uid, inr, MIN_LOANABLE, savingsBalance, savingsInterestEarned, shortSavingId, type SavingAccount } from "@/lib/store";
import { PiggyBank, Sparkles, X, UserPlus, ArrowUpRight, ArrowDownLeft, Settings2, Search, Bell, Receipt as ReceiptIcon } from "lucide-react";

export const Route = createFileRoute("/savings")({
  head: () => ({ meta: [{ title: "Savings — Smart Finance" }] }),
  component: Savings,
});

type Modal =
  | { kind: "deposit"; customerId: string }
  | { kind: "withdraw"; customerId: string }
  | { kind: "account"; customerId: string }
  | { kind: "addCustomer" }
  | null;

function Savings() {
  const data = useDB();
  const session = useSession();
  const isOwner = session?.role === "owner";
  const isCollector = session?.role === "collector";
  const [tab, setTab] = useState<"all" | "ready" | "history">("all");
  const [modal, setModal] = useState<Modal>(null);
  const [q, setQ] = useState("");
  const [histName, setHistName] = useState("");
  const [histDate, setHistDate] = useState("");

  const scopedCustomers = isCollector
    ? data.customers.filter((c) => c.collectorUsername === session!.username)
    : data.customers;

  const totals = useMemo(
    () =>
      scopedCustomers
        .map((c) => {
          const list = data.savings.filter((s) => s.customerId === c.id).sort((a, b) => b.date - a.date);
          const total = savingsBalance(c.id, data.savings);
          const savedAccount = data.savingAccounts.find((a) => a.customerId === c.id);
          const account = savedAccount ?? (list.length > 0 ? { id: `auto-${c.id}`, customerId: c.id, maturityMonths: 12, interestRatePct: 6, openedAt: list[list.length - 1].date } satisfies SavingAccount : undefined);
          return { ...c, total, list, account };
        })
        .sort((a, b) => b.total - a.total),
    [data, scopedCustomers]
  );

  const grand = totals.reduce((s, c) => s + c.total, 0);
  const readyCount = totals.filter((c) => c.total >= MIN_LOANABLE).length;
  const searched = totals.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  const view = tab === "ready" ? searched.filter((c) => c.total >= MIN_LOANABLE) : searched;
  const tabs = isCollector ? (["all", "history"] as const) : (["all", "ready", "history"] as const);
  const scopedSavings = isCollector
    ? data.savings.filter((s) => scopedCustomers.some((c) => c.id === s.customerId))
    : data.savings;

  return (
    <AppShell title="Savings">
      <div className="px-4 pt-4 animate-fade">
        <div className="bg-gradient-card text-primary-foreground rounded-2xl p-4 shadow-card">
          <p className="text-xs opacity-80">Total Savings Pool</p>
          <p className="text-2xl font-bold">{inr(grand)}</p>
          {isOwner && (
            <p className="mt-1 text-[11px] opacity-80">
              {readyCount} customer{readyCount === 1 ? "" : "s"} ready to lend (≥ {inr(MIN_LOANABLE)})
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            onClick={() => setModal({ kind: "addCustomer" })}
            className="w-full bg-card border border-dashed border-primary/40 text-primary rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <UserPlus className="size-4" /> Add Saving Customer
          </button>
          {isOwner && (
            <button
              onClick={() => db.update((d) => { d.savingSmsAlerts = !d.savingSmsAlerts; })}
              className="w-full bg-card border border-border rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Bell className="size-4 text-primary" /> Saving SMS Alert: {data.savingSmsAlerts ? "On" : "Off / setup later"}
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2.5 shadow-soft">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search saving customer"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <div className="mt-3 flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${tab === t ? "bg-card shadow-soft" : "text-muted-foreground"}`}
            >
              {t === "all" ? "All" : t === "ready" ? "Ready" : "History"}
            </button>
          ))}
        </div>

        {tab !== "history" && (
          <div className="mt-3 space-y-2">
            {view.map((c) => {
              const ready = c.total >= MIN_LOANABLE;
              const interest = c.account ? savingsInterestEarned(c.account, c.total) : 0;
              return (
                <div
                  key={c.id}
                  className={`rounded-2xl p-3 shadow-soft border animate-pop ${
                    ready ? "bg-accent border-primary/30 ring-1 ring-primary/40" : "bg-card border-border"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <Link to="/customers/$id" params={{ id: c.id }} className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate flex items-center gap-1">
                        {c.name}
                        {ready && <Sparkles className="size-3 text-primary" />}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                      {c.account && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Maturity: {c.account.maturityMonths}m · Interest: {c.account.interestRatePct}% yr
                          {interest > 0 && <span className="text-success"> · earned {inr(interest)}</span>}
                        </p>
                      )}
                    </Link>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${ready ? "text-primary" : "text-success"}`}>{inr(c.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.list.length} txns</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setModal({ kind: "deposit", customerId: c.id })}
                      className="text-[11px] bg-primary text-primary-foreground rounded-full px-3 py-1 font-semibold inline-flex items-center gap-1"
                    >
                      <ArrowDownLeft className="size-3" /> Deposit
                    </button>
                    <button
                      onClick={() => setModal({ kind: "withdraw", customerId: c.id })}
                      disabled={c.total <= 0}
                      className="text-[11px] bg-card border border-border rounded-full px-3 py-1 font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <ArrowUpRight className="size-3" /> Withdraw
                    </button>
                    <button
                      onClick={() => setModal({ kind: "account", customerId: c.id })}
                      className="text-[11px] bg-card border border-border rounded-full px-3 py-1 font-semibold inline-flex items-center gap-1"
                    >
                      <Settings2 className="size-3" /> {c.account ? (isOwner ? "Edit" : "View") : isOwner ? "Open A/c" : "View"}
                    </button>
                  </div>
                  {ready && (
                    <p className="mt-2 text-[10px] font-medium text-primary">
                      ✦ Eligible to lend this saving as a loan to another customer
                    </p>
                  )}
                </div>
              );
            })}
            {view.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No customers here yet</p>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={histName}
                onChange={(e) => setHistName(e.target.value)}
                placeholder="Filter by name"
                className="rounded-xl border border-input bg-card px-3 py-2 text-xs outline-none"
              />
              <input
                type="date"
                value={histDate}
                onChange={(e) => setHistDate(e.target.value)}
                className="rounded-xl border border-input bg-card px-3 py-2 text-xs outline-none"
              />
            </div>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
              {(() => {
                const list = scopedSavings
                  .slice()
                  .sort((a, b) => b.date - a.date)
                  .filter((s) => {
                    const c = data.customers.find((x) => x.id === s.customerId);
                    if (histName && !(c?.name.toLowerCase().includes(histName.toLowerCase()))) return false;
                    if (histDate && new Date(s.date).toISOString().slice(0, 10) !== histDate) return false;
                    return true;
                  });
                if (list.length === 0)
                  return <p className="text-center text-sm text-muted-foreground p-6">No matching transactions</p>;
                return list.map((s) => {
                  const c = data.customers.find((x) => x.id === s.customerId);
                  const isWith = s.type === "withdrawal";
                  return (
                    <div key={s.id} className="flex justify-between items-center p-3 text-sm gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate flex items-center gap-1">
                          {c?.name ?? "—"}
                          <span className="text-[9px] font-mono bg-muted text-muted-foreground rounded px-1">{shortSavingId(s.id)}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(s.date).toLocaleDateString()} · {isWith ? "Withdraw" : "Deposit"}
                        </p>
                      </div>
                      <span className={`font-semibold ${isWith ? "text-destructive" : "text-success"}`}>
                        {isWith ? "-" : "+"} {inr(s.amount)}
                      </span>
                      <Link
                        to="/receipt/saving/$savingId"
                        params={{ savingId: s.id }}
                        className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center"
                        aria-label="Receipt"
                      >
                        <ReceiptIcon className="size-3.5" />
                      </Link>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {modal && <ModalSheet modal={modal} close={() => setModal(null)} isOwner={isOwner} collectorUsername={isCollector ? session!.username : undefined} />}
    </AppShell>
  );
}

function ModalSheet({ modal, close, isOwner, collectorUsername }: { modal: Exclude<Modal, null>; close: () => void; isOwner: boolean; collectorUsername?: string }) {
  const data = useDB();
  const navigate = useNavigate();
  const customer =
    modal.kind !== "addCustomer" ? data.customers.find((c) => c.id === modal.customerId) : undefined;
  const account = customer ? data.savingAccounts.find((a) => a.customerId === customer.id) : undefined;
  const balance = customer ? savingsBalance(customer.id, data.savings) : 0;

  // shared state
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  // account editor
  const [maturity, setMaturity] = useState(account?.maturityMonths ? String(account.maturityMonths) : "12");
  const [rate, setRate] = useState(account?.interestRatePct != null ? String(account.interestRatePct) : "6");

  // add customer
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const submit = () => {
    if (modal.kind === "addCustomer") {
      if (!name.trim() || !phone.trim()) return;
      db.update((d) => {
        const id = uid();
        d.customers.unshift({ id, name: name.trim(), phone: phone.trim(), address: "", collectorUsername, createdAt: Date.now() });
        d.savingAccounts.push({
          id: uid(),
          customerId: id,
          maturityMonths: Number(maturity) || 12,
          interestRatePct: Number(rate) || 0,
          openedAt: Date.now(),
        });
      });
      close();
      return;
    }
    if (modal.kind === "account") {
      if (!isOwner) return close();
      db.update((d) => {
        const existing = d.savingAccounts.find((a) => a.customerId === modal.customerId);
        if (existing) {
          existing.maturityMonths = Number(maturity) || existing.maturityMonths;
          existing.interestRatePct = Number(rate) || 0;
        } else {
          d.savingAccounts.push({
            id: uid(),
            customerId: modal.customerId,
            maturityMonths: Number(maturity) || 12,
            interestRatePct: Number(rate) || 0,
            openedAt: Date.now(),
          });
        }
      });
      close();
      return;
    }
    const a = Number(amount);
    if (!a) return;
    if (modal.kind === "withdraw" && a > balance) return;
    const ts = new Date(date).getTime() || Date.now();
    db.update((d) => {
      d.savings.unshift({
        id: uid(),
        customerId: modal.customerId,
        amount: a,
        type: modal.kind === "withdraw" ? "withdrawal" : "deposit",
        date: ts,
        note: note || undefined,
      });
      if (modal.kind === "deposit" && !d.savingAccounts.some((x) => x.customerId === modal.customerId)) {
        d.savingAccounts.push({ id: uid(), customerId: modal.customerId, maturityMonths: 12, interestRatePct: 6, openedAt: ts });
      }
    });
    close();
  };

  const titles: Record<typeof modal.kind, string> = {
    deposit: `Deposit — ${customer?.name ?? ""}`,
    withdraw: `Withdraw — ${customer?.name ?? ""}`,
    account: `Saving Account — ${customer?.name ?? ""}`,
    addCustomer: "Add Saving Customer",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center animate-fade" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-5 shadow-card animate-sheet">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{titles[modal.kind]}</h3>
          <button onClick={close} className="size-8 rounded-full bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        {modal.kind === "addCustomer" && (
          <div className="space-y-3">
            <Input label="Full Name *" value={name} onChange={setName} />
            <Input label="Phone *" value={phone} onChange={setPhone} type="tel" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Maturity (months)" value={maturity} onChange={setMaturity} type="number" />
              <Input label="Interest yearly %" value={rate} onChange={setRate} type="number" />
            </div>
          </div>
        )}

        {modal.kind === "account" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Current balance: <span className="font-semibold text-foreground">{inr(balance)}</span></p>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Maturity (months)" value={maturity} onChange={setMaturity} type="number" disabled={!isOwner} />
              <Input label="Interest yearly %" value={rate} onChange={setRate} type="number" disabled={!isOwner} />
            </div>
            {account && (
              <p className="text-[11px] text-muted-foreground">
                Opened {new Date(account.openedAt).toLocaleDateString()} · Interest earned so far: {inr(savingsInterestEarned({ ...account, maturityMonths: Number(maturity) || account.maturityMonths, interestRatePct: Number(rate) || 0 }, balance))}
              </p>
            )}
            {!isOwner && <p className="text-[11px] text-warning-foreground bg-warning/30 rounded-lg p-2">View only — only Admin can edit.</p>}
          </div>
        )}

        {(modal.kind === "deposit" || modal.kind === "withdraw") && (
          <div className="space-y-3">
            {modal.kind === "withdraw" && (
              <p className="text-xs text-muted-foreground">Available: <span className="font-semibold text-foreground">{inr(balance)}</span></p>
            )}
            <Input label="Amount (₹)" value={amount} onChange={setAmount} type="number" autoFocus />
            <Input label="Date" value={date} onChange={setDate} type="date" />
            <Input label="Note (optional)" value={note} onChange={setNote} />
            {modal.kind === "deposit" && (
              <p className="text-[11px] text-muted-foreground bg-muted rounded-lg p-2">
                SMS alert: {data.savingSmsAlerts ? "ready when SMS setup is connected" : "off — setup later"}
              </p>
            )}
          </div>
        )}

        <button onClick={submit} className="mt-4 w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold">
          {modal.kind === "addCustomer" ? "Create Customer" : modal.kind === "account" ? (isOwner ? "Save" : "Close") : "Confirm"}
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", autoFocus, disabled }: { label: string; value: string; onChange: (v: string) => void; type?: string; autoFocus?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        autoFocus={autoFocus}
        disabled={disabled}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none disabled:opacity-60"
      />
    </div>
  );
}
