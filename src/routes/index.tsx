import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sprout } from "lucide-react";
import { getSession } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Finance — Microfinance & Daily Collection" },
      { name: "description", content: "Manage customers, loans, daily EMI collections, savings and reports." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = getSession();
      navigate({ to: s ? "/dashboard" : "/login" });
    }, 120);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-primary text-primary-foreground flex flex-col items-center justify-center max-w-md mx-auto">
      <div className="animate-in fade-in zoom-in duration-700 flex flex-col items-center gap-4">
        <div className="size-24 rounded-3xl bg-white/15 backdrop-blur-sm grid place-items-center shadow-card">
          <Sprout className="size-12" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Finance</h1>
        <p className="text-sm opacity-80">Microfinance · Daily Collection</p>
      </div>
      <div className="absolute bottom-10 text-xs opacity-70">Loading…</div>
    </div>
  );
}
