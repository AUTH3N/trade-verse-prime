import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/home" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            V
          </div>
          <span className="text-lg font-semibold tracking-tight">Vyro</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            AI-powered paper trading for Indian markets
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Trade NIFTY, BANKNIFTY & options{" "}
            <span className="text-primary">without risking a rupee.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Broker-grade order execution, live Greeks, multi-leg strategies, backtesting, and AI trade
            reviews — all on virtual funds. Practice like it's real, then trade for real.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              Start paper trading — free
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-border bg-surface-1 px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-2 transition"
            >
              See what's inside
            </a>
          </div>
        </div>

        <div id="features" className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: TrendingUp,
              title: "Real broker feel",
              body: "Market, Limit, SL, Bracket, Cover, GTT, Basket, Iceberg, AMO — with realistic slippage and Indian tax/brokerage math.",
            },
            {
              icon: LineChart,
              title: "F&O done right",
              body: "Live option chain with OI, IV, and full Greeks. Build straddles, condors, and custom multi-leg strategies with payoff graphs and SPAN-style margin.",
            },
            {
              icon: ShieldCheck,
              title: "AI trading coach",
              body: "Every trade gets reviewed. Get scores on entries, sizing, risk, and discipline — then weekly personalized improvement reports.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface-1 p-6">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          Vyro is a paper trading simulator for educational use. It uses virtual funds only — no
          real money, no real orders sent to any exchange.
        </div>
      </footer>
    </div>
  );
}
