import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout, User as UserIcon, Lock } from "lucide-react";
import { getLoginAccounts, setSession } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Smart Finance" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (u: string, p: string) => {
    const accounts = getLoginAccounts();
    const acc = accounts.find((a) => a.username === u && a.password === p);
    if (!acc) {
      setError("Invalid username or password");
      return;
    }
    setSession({ username: acc.username, role: acc.role, name: acc.name });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col">
      <div className="bg-gradient-primary text-primary-foreground px-6 pt-12 pb-16 rounded-b-[2rem] shadow-card">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/15 grid place-items-center">
            <Sprout className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Smart Finance</h1>
            <p className="text-xs opacity-80">Welcome back</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          handleLogin(username, password);
        }}
        className="px-6 -mt-10"
      >
        <div className="bg-card rounded-2xl shadow-card border border-border p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-input/40 px-3 py-2.5">
              <UserIcon className="size-4 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="admin or collector"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-input/40 px-3 py-2.5">
              <Lock className="size-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-card active:scale-[0.99]"
          >
            Sign In
          </button>
        </div>

        <div className="mt-5 text-xs text-muted-foreground text-center">Quick login (demo)</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleLogin("owner", "owner123")}
            type="button"
            className="rounded-xl border border-border bg-card py-2.5 text-sm font-medium active:scale-[0.99]"
          >
            Admin
          </button>
          <button
            onClick={() => handleLogin("collector", "collect123")}
            type="button"
            className="rounded-xl border border-border bg-card py-2.5 text-sm font-medium active:scale-[0.99]"
          >
            Collector
          </button>
        </div>
      </form>
    </div>
  );
}
