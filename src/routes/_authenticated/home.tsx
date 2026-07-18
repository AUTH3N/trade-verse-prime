import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, getWallet } from "@/lib/account.functions";
import { formatINR, formatPct, signedClass } from "@/lib/format";
import { ArrowDownRight, ArrowUpRight, Newspaper, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Vyro" },
      { name: "description", content: "Your portfolio, indices, and market pulse." },
    ],
  }),
  component: HomePage,
});

const MOCK_INDICES = [
  { name: "NIFTY 50", value: 24812.55, change: 132.4, pct: 0.54 },
  { name: "BANK NIFTY", value: 51043.2, change: -218.75, pct: -0.43 },
  { name: "SENSEX", value: 81344.15, change: 402.8, pct: 0.5 },
  { name: "NIFTY MIDCAP", value: 58412.6, change: 305.1, pct: 0.53 },
];

const MOCK_WATCHLIST = [
  { symbol: "RELIANCE", last: 2942.55, chg: 24.7, pct: 0.85 },
  { symbol: "TCS", last: 4287.1, chg: -18.2, pct: -0.42 },
  { symbol: "HDFCBANK", last: 1642.35, chg: 12.4, pct: 0.76 },
  { symbol: "INFY", last: 1855.9, chg: -5.65, pct: -0.3 },
];

const MOCK_NEWS = [
  { title: "RBI holds repo rate steady, GDP outlook revised up", source: "MoneyControl", when: "12m" },
  { title: "IT stocks under pressure as US yields spike", source: "ET Markets", when: "42m" },
  { title: "Oil marketing companies rally on crude weakness", source: "Livemint", when: "1h" },
];

function HomePage() {
  const walletFn = useServerFn(getWallet);
  const profileFn = useServerFn(getProfile);

  const walletQ = useSuspenseQuery(
    queryOptions({ queryKey: ["wallet"], queryFn: () => walletFn() }),
  );
  const profileQ = useSuspenseQuery(
    queryOptions({ queryKey: ["profile"], queryFn: () => profileFn() }),
  );

  const wallet = walletQ.data;
  const equity = Number(wallet.balance) + Number(wallet.margin_used);
  const pnl = equity - Number(wallet.starting_capital);
  const pnlPct = (pnl / Number(wallet.starting_capital)) * 100;

  const greeting = greet(profileQ.data?.display_name);

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs text-muted-foreground">{greeting}</div>
        <h1 className="text-xl font-semibold tracking-tight">Welcome to Vyro</h1>
      </section>

      <section className="rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-2 p-5">
        <div className="text-xs text-muted-foreground">Portfolio value</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-semibold tabular-nums">{formatINR(equity)}</div>
          <div className={`text-sm font-medium tabular-nums ${signedClass(pnl)}`}>
            {pnl >= 0 ? "+" : ""}
            {formatINR(pnl)} ({formatPct(pnlPct)})
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <Stat label="Cash" value={formatINR(wallet.balance)} />
          <Stat label="Margin used" value={formatINR(wallet.margin_used)} />
          <Stat label="Realized P&L" value={formatINR(wallet.realized_pnl)} tone={Number(wallet.realized_pnl)} />
        </div>
      </section>

      <section>
        <SectionHeader icon={TrendingUp} title="Indices" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MOCK_INDICES.map((i) => (
            <div key={i.name} className="rounded-xl border border-border bg-surface-1 p-3">
              <div className="text-xs text-muted-foreground">{i.name}</div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {i.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className={`mt-0.5 flex items-center gap-1 text-xs tabular-nums ${signedClass(i.change)}`}>
                {i.change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {i.change >= 0 ? "+" : ""}
                {i.change.toFixed(2)} ({formatPct(i.pct)})
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Your watchlist" />
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-1">
          {MOCK_WATCHLIST.map((s) => (
            <div key={s.symbol} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-semibold">{s.symbol}</div>
                <div className="text-[11px] text-muted-foreground">NSE · EQ</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums">
                  {s.last.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-[11px] tabular-nums ${signedClass(s.chg)}`}>
                  {s.chg >= 0 ? "+" : ""}
                  {s.chg.toFixed(2)} ({formatPct(s.pct)})
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader icon={Newspaper} title="Market news" />
        <div className="mt-3 space-y-2">
          {MOCK_NEWS.map((n) => (
            <div key={n.title} className="rounded-xl border border-border bg-surface-1 p-3">
              <div className="text-sm font-medium leading-snug">{n.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {n.source} · {n.when} ago
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-lg bg-background/50 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${tone !== undefined ? signedClass(tone) : ""}`}>
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function greet(name?: string | null) {
  const h = new Date().getHours();
  const base = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${base}, ${name}` : base;
}
