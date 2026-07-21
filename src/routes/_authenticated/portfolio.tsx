import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Filter, MoreVertical, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatPct, signedClass } from "@/lib/format";

const soon = (what: string) => toast.info(`${what} — coming soon`);

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — Vyro" }] }),
  component: PortfolioPage,
});

const HEADER_INDICES = [
  { name: "NIFTY", value: 24196.8, change: -137.5, pct: -0.56 },
  { name: "SENSEX", value: 77594.86, change: -556.59, pct: -0.71 },
];

const POSITIONS = [
  { lots: 0, sym: "GOLDM", strike: "140000 PUT", exp: "29 JUL", type: "MIS", exch: "MCX", pnl: -455, ltp: 1493.5 },
  { lots: 0, sym: "NIFTY", strike: "24200 PUT", exp: "21 JUL", type: "BRACKET ORDER", exch: "NSE", pnl: -1131, ltp: 100.85 },
  { lots: 0, sym: "NIFTY", strike: "24700 CALL", exp: "21 JUL", type: "NRML", exch: "NSE", pnl: -571.12, ltp: 2.65 },
];

function PortfolioPage() {
  const [tab, setTab] = useState<"Investments" | "Positions">("Investments");

  return (
    <div className="-mt-3 space-y-3">
      <section className="rounded-2xl border border-border bg-surface-1 p-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            {HEADER_INDICES.map((i) => (
              <div key={i.name}>
                <div className="text-[11px] font-semibold">{i.name}</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold tabular-nums">
                    {i.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] tabular-nums ${signedClass(i.change)}`}>
                    {i.change.toFixed(2)} ({formatPct(i.pct)})
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="text-primary">
            <ChevronDown className="size-5" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 border-b border-border">
        {(["Investments", "Positions"] as const).map((t) => {
          const count = t === "Investments" ? 2 : 3;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex items-center justify-center gap-2 py-3 text-sm font-semibold tracking-wide ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t.toUpperCase()}
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
              {active && (
                <span className="absolute inset-x-8 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {tab === "Investments" ? <InvestmentsView /> : <PositionsView />}
    </div>
  );
}

function InvestmentsView() {
  const [sub, setSub] = useState<"Overview" | "Stocks" | "Mutual Funds" | "ETFs">("Overview");
  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["Overview", "Stocks", "Mutual Funds", "ETFs"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold ${
              sub === s ? "border-primary bg-primary text-primary-foreground" : "border-primary text-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-muted-foreground">Portfolio value</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums">16,439</span>
            <span className="text-xs text-bull">(+1.15%)</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="space-y-2">
            <AllocBar label="Stocks" pct={100} color="bear" />
            <AllocBar label="Mutual Funds" pct={0} color="purple" />
            <AllocBar label="ETFs" pct={0} color="bull" />
          </div>
          <div className="grid size-24 place-items-center rounded-full border-[10px] border-bear/50 bg-surface-2 text-xs">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">Alloc</div>
              <div className="font-bold">100%</div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-2">
        <Link
          to="/portfolio"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3.5"
        >
          <span className="text-sm font-semibold">Stocks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tabular-nums">16,439</span>
            <span className="text-xs text-bull">(+1.15%)</span>
            <span className="text-muted-foreground">›</span>
          </div>
        </Link>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3.5">
          <div>
            <div className="text-sm font-semibold">Mutual Funds</div>
            <div className="text-xs text-muted-foreground">Start your first SIP with top funds</div>
          </div>
          <button className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">
            Explore
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3.5">
          <div>
            <div className="text-sm font-semibold">ETFs</div>
            <div className="text-xs text-muted-foreground">Start with top performing ETFs</div>
          </div>
          <button className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary">
            Explore
          </button>
        </div>
      </div>
    </div>
  );
}

function AllocBar({ label, pct, color }: { label: string; pct: number; color: "bear" | "bull" | "purple" }) {
  const border =
    color === "bear" ? "border-bear/60" : color === "bull" ? "border-bull/60" : "border-primary/60";
  return (
    <div className={`flex items-center justify-between rounded-xl border-2 ${border} bg-surface-2/30 px-3 py-2`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold">{pct}%</span>
    </div>
  );
}

function PositionsView() {
  const totalPnl = POSITIONS.reduce((s, p) => s + p.pnl, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-3.5">
        <span className="text-sm text-muted-foreground">Profit/Loss</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold tabular-nums ${signedClass(totalPnl)}`}>
            {totalPnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
          <ChevronDown className="size-4 text-primary" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="Search in positions"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm">
          <TrendingUp className="size-4" /> Analyze
        </button>
        <button className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1">
          <Filter className="size-4" />
        </button>
        <button className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1">
          <MoreVertical className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="peer sr-only" />
          <span className="relative inline-block h-5 w-9 rounded-full bg-muted peer-checked:bg-primary">
            <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition peer-checked:translate-x-4" />
          </span>
          Today's positions
        </label>
        <button className="text-sm text-muted-foreground underline decoration-dotted">
          Square off all
        </button>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
        {POSITIONS.map((p) => (
          <div key={p.sym + p.strike} className="px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{p.lots} LOTS</span>
              <span>{p.type}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{p.sym}</span>
                <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[10px] font-semibold text-bear">
                  {p.strike}
                </span>
                <span className="text-[10px] font-semibold text-bear">{p.exp}</span>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${signedClass(p.pnl)}`}>
                {p.pnl.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {p.exch} · AVG <span className="text-foreground">0.00</span>
              </span>
              <span>
                LTP <span className="text-foreground font-semibold tabular-nums">{p.ltp.toFixed(2)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
