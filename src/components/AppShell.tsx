import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Users, IndianRupee, PiggyBank, TrendingUp, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useSession, setSession, type Role } from "@/lib/store";

const navByRole: Record<Role, { to: string; label: string; icon: typeof Home }[]> = {
  owner: [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/collect", label: "Collect", icon: IndianRupee },
    { to: "/savings", label: "Savings", icon: PiggyBank },
    { to: "/profit", label: "Profit", icon: TrendingUp },
    { to: "/settings", label: "More", icon: SettingsIcon },
  ],
  collector: [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/collect", label: "Collect", icon: IndianRupee },
    { to: "/savings", label: "Savings", icon: PiggyBank },
    { to: "/settings", label: "More", icon: SettingsIcon },
  ],
};

interface Props {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  showBack?: boolean;
}

export function AppShell({ title, children, right, showBack }: Props) {
  const session = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session === null) {
      const t = setTimeout(() => {
        if (!localStorage.getItem("smartfinance_session_v1")) {
          navigate({ to: "/login" });
        }
      }, 50);
      return () => clearTimeout(t);
    }
  }, [mounted, session, navigate]);

  const items = navByRole[session?.role ?? "collector"];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-30 bg-gradient-primary text-primary-foreground shadow-card">
        <div className="px-4 pt-4 pb-5 flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => window.history.back()}
              aria-label="Back"
              className="size-9 rounded-full bg-white/15 grid place-items-center active:scale-95"
            >
              ‹
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {mounted && session && (
              <p className="text-xs opacity-80 truncate">
                {session.name} · {session.role === "owner" ? "Admin" : "Collector"}
              </p>
            )}
          </div>
          {right}
          <button
            onClick={() => {
              setSession(null);
              navigate({ to: "/login" });
            }}
            aria-label="Logout"
            className="size-9 rounded-full bg-white/15 grid place-items-center active:scale-95"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto safe-bottom">
        <div className="mx-3 mb-2 rounded-2xl bg-card shadow-card border border-border flex justify-around p-1.5">
          {items.map((item) => {
            const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
