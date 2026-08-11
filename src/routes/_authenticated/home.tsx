import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Eye, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatINR, formatPct, signedClass } from "@/lib/format";
import { TradeTicket, type TradeTarget } from "@/components/trade-ticket";
import { listPositions } from "@/lib/trading.functions";
import { getWallet } from "@/lib/account.functions";

const soon = (what: string) => toast.info(`${what} — coming soon`);

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Vyro" },
      { name: "description", content: "Your investments, F&O positions, and market pulse." },
    ],
  }),
  component: HomePage,
});

const TABS = ["Stocks", "F&O"] as const;
type Tab = (typeof TABS)[number];

const INDICES = [
  { name: "NIFTY", value: 24199.45, change: -134.85, pct: -0.55 },
  { name: "SENSEX", value: 77614.34, change: -537.11, pct: -0.69 },
  { name: "BANKNIFTY", value: 57692.55, change: -828.85, pct: -1.42 },
  { name: "FINNIFTY", value: 23110.4, change: -128.6, pct: -0.55 },
];

const MOST_BOUGHT_STOCKS = [
  { symbol: "HDFCBANK", ltp: 783.4, chg: -36.2, pct: -4.42, color: "#ed1c24" },
  { symbol: "ICICIBANK", ltp: 1455.5, chg: 11.2, pct: 0.78, color: "#f37037" },
  { symbol: "AXISBANK", ltp: 1263.1, chg: -65.4, pct: -4.92, color: "#a01e3c" },
];

const MOST_BOUGHT_OPTIONS = [
  { symbol: "NIFTY", strike: 24200, side: "CE" as const, ltp: 78.9, pct: -56.76 },
  { symbol: "SENSEX", strike: 77800, side: "CE" as const, ltp: 327.5, pct: -53.09 },
  { symbol: "BANKNIFTY", strike: 57700, side: "PE" as const, ltp: 412.15, pct: 28.4 },
];

const OPTION_INDEXES = [
  { symbol: "NIFTY", color: "from-red-500 to-orange-500", label: "N" },
  { symbol: "SENSEX", color: "from-slate-600 to-slate-800", label: "BSE" },
  { symbol: "BANKNIFTY", color: "from-amber-500 to-yellow-600", label: "BANK" },
  { symbol: "BANKEX", color: "from-purple-500 to-purple-700", label: "🏛" },
  { symbol: "FINNIFTY", color: "from-blue-500 to-blue-700", label: "FIN" },
  { symbol: "MIDCPNIFTY", color: "from-pink-500 to-red-600", label: "MIDCAP" },
];

const INVESTMENT_PRODUCTS = [
  { label: "IPO", badge: "5 Live", icon: "📢" },
  { label: "Stock Baskets", icon: "🧺" },
  { label: "Stocks SIPs", icon: "sipit" },
  { label: "ETF", icon: "↗" },
];

function HomePage() {
  const [tab, setTab] = useState<Tab>("Stocks");
  const [ticket, setTicket] = useState<{ target: TradeTarget; side: "BUY" | "SELL" } | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative py-3 text-sm font-medium transition ${
              tab === t ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "Stocks" && <StocksTab onTrade={(t) => setTicket({ target: t, side: "BUY" })} />}
      {tab === "F&O" && <FnoTab onTrade={(t) => setTicket({ target: t, side: "BUY" })} />}
      {ticket && (
        <TradeTicket
          target={ticket.target}
          side={ticket.side}
          onClose={() => setTicket(null)}
        />
      )}
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      {right}
    </div>
  );
}

function IndicesRow() {
  return (
    <section>
      <SectionTitle
        title="Market indices"
        right={
          <button onClick={() => soon("All indices")} className="flex items-center gap-0.5 text-sm font-medium text-primary">
            View all <ChevronRight className="size-4" />
          </button>
        }
      />
      <div className="mt-3 -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {INDICES.map((i) => (
          <Link
            key={i.name}
            to="/instrument/$symbol"
            params={{ symbol: i.name }}
            className="min-w-[46%] snap-start rounded-2xl border border-border bg-surface-1 p-4 text-left transition hover:border-primary/60"
          >
            <div className="text-[11px] font-semibold tracking-wide">{i.name}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {i.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`mt-1 text-xs tabular-nums ${signedClass(i.change)}`}>
              {i.change >= 0 ? "+" : ""}
              {i.change.toFixed(2)} ({formatPct(i.pct)})
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PortfolioSummary() {
  const posFn = useServerFn(listPositions);
  const walletFn = useServerFn(getWallet);
  const { data: positions } = useQuery({ queryKey: ["positions"], queryFn: () => posFn() });
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => walletFn() });

  const active = (positions ?? []).filter((p) => p.qty > 0);
  const invested = active.reduce((s, p) => s + p.avg_price * p.qty, 0);
  const current = active.reduce((s, p) => s + p.last_price * p.qty, 0);
  const returns = current - invested;
  const returnsPct = invested > 0 ? (returns / invested) * 100 : 0;
  const hasPositions = active.length > 0;

  return (
    <section>
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        Investments summary <Eye className="size-4 text-primary" />
      </div>
      <Link
        to="/portfolio"
        className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-4"
      >
        <div>
          {hasPositions ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">Portfolio value</span>
                <span className="text-xl font-bold tabular-nums">{formatINR(current)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Total Returns{" "}
                <span className={`font-semibold ${signedClass(returns)}`}>
                  {returns >= 0 ? "+" : ""}
                  {returns.toFixed(2)} ({formatPct(returnsPct)})
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">Available balance</span>
                <span className="text-xl font-bold tabular-nums">
                  {formatINR(Number(wallet?.balance ?? 0))}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                No holdings yet — start paper trading to build your portfolio
              </div>
            </>
          )}
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </section>
  );
}

function StocksTab({ onTrade }: { onTrade: (t: TradeTarget) => void }) {
  return (
    <div className="space-y-5">
      <PortfolioSummary />

      <IndicesRow />

      <section>
        <SectionTitle title="Most bought on Vyro" />
        <div className="mt-3 -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MOST_BOUGHT_STOCKS.map((s) => (
            <div
              key={s.symbol}
              className="min-w-[46%] snap-start rounded-2xl border border-border bg-surface-1 p-4 text-left transition hover:border-primary/60"
            >
              <Link to="/instrument/$symbol" params={{ symbol: s.symbol }} className="block">
              <div
                className="grid size-8 place-items-center rounded-full text-[9px] font-bold text-white"
                style={{ background: s.color }}
              >
                {s.symbol.slice(0, 4)}
              </div>
              <div className="mt-2 text-sm font-bold">{s.symbol}</div>
              <div className="mt-1 text-base font-semibold tabular-nums">{s.ltp.toFixed(2)}</div>
              <div className={`text-xs tabular-nums ${signedClass(s.chg)}`}>
                {s.chg >= 0 ? "+" : ""}
                {s.chg.toFixed(2)} ({formatPct(s.pct)})
              </div>
              </Link>
              <button
                type="button"
                onClick={() =>
                  onTrade({ symbol: s.symbol, price: s.ltp, exchange: "NSE", instrument_type: "EQ" })
                }
                className="mt-2 w-full rounded-lg bg-primary/15 py-1.5 text-xs font-semibold text-primary"
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="text-sm font-medium text-muted-foreground">Investment products</div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {INVESTMENT_PRODUCTS.map((p) => (
            <button
              key={p.label}
              onClick={() => soon(p.label)}
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-surface-1 p-2 text-center transition hover:bg-surface-2"
            >
              <div className="relative grid size-11 place-items-center rounded-lg bg-background text-xl">
                {p.icon}
                {p.badge && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1 py-0.5 text-[8px] font-semibold text-primary-foreground">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-medium leading-tight">{p.label}</div>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => soon("Vyro AI")}
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 p-4 text-left"
      >
        <div className="mb-1 inline-block rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
          NEW
        </div>
        <div className="text-base font-bold">Vyro AI: Your Investing Buddy</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Analyse. Screen. Explore. Ask.</div>
        <div className="absolute right-4 top-1/2 size-12 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary to-bear opacity-90 blur-sm" />
      </button>
    </div>
  );
}

function FnoTab({ onTrade }: { onTrade: (t: TradeTarget) => void }) {
  const posFn = useServerFn(listPositions);
  const { data: positions } = useQuery({ queryKey: ["positions"], queryFn: () => posFn() });
  const fno = (positions ?? []).filter((p) => p.instrument_type !== "EQ" && p.qty !== 0);
  const fnoPnl = fno.reduce((s, p) => s + (p.last_price - p.avg_price) * p.qty, 0);

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            Position summary <Eye className="size-4 text-primary" />
          </div>
          <Link to="/portfolio" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <TrendingUp className="size-4" /> Analyze
          </Link>
        </div>
        <Link
          to="/portfolio"
          className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-surface-1 px-4 py-4"
        >
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-muted-foreground">Profit/Loss</span>
            <span className={`text-lg font-bold tabular-nums ${signedClass(fnoPnl)}`}>
              {fno.length === 0 ? "—" : fnoPnl.toFixed(2)}
            </span>
          </div>
          <ChevronRight className="size-5 text-primary" />
        </Link>
      </section>

      <IndicesRow />

      <section>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">Option chain</div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-bull" /> Live
          </div>
        </div>

        <OptionChainFilters />

        <div className="mt-4 -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {OPTION_INDEXES.map((o) => {
            return (
              <Link
                key={o.symbol}
                to="/instrument/$symbol"
                params={{ symbol: o.symbol }}
                className="flex min-w-[64px] flex-col items-center gap-1.5"
              >
                <div
                  className={`grid size-14 place-items-center rounded-full bg-gradient-to-br text-[9px] font-black text-white ${o.color}`}
                >
                  {o.label}
                </div>
                <div className="text-[10px] font-medium">{o.symbol}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="text-sm font-medium text-muted-foreground">Most bought options</div>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface-1">
          {MOST_BOUGHT_OPTIONS.map((o) => (
            <button
              key={o.symbol + o.strike + o.side}
              type="button"
              onClick={() =>
                onTrade({
                  symbol: o.symbol,
                  instrument_type: o.side,
                  strike: o.strike,
                  price: o.ltp,
                  exchange: "NSE",
                  lotSize: o.symbol === "BANKNIFTY" ? 15 : 25,
                })
              }
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-surface-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{o.symbol}</span>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {o.strike} {o.side}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold tabular-nums">{o.ltp.toFixed(2)}</span>
                <span className={`text-xs tabular-nums ${signedClass(o.pct)}`}>
                  ({formatPct(o.pct)})
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="text-sm font-medium text-muted-foreground">Trading tools</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            to="/fno"
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-2 p-4"
          >
            <div className="text-sm font-bold">Trade from Charts</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Superfast trading & scalping
            </div>
            <div className="absolute -bottom-4 -right-2 size-14 rounded-full bg-warn/20 blur-md" />
          </Link>
          <Link
            to="/fno"
            className="rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-2 p-4"
          >
            <div className="text-sm font-bold">Strategy Bot</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Algo trading</div>
          </Link>
          <Link
            to="/fno"
            className="col-span-2 rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-2 p-4"
          >
            <div className="text-sm font-bold">Options Screener</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Top Traded</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function OptionChainFilters() {
  const [seg, setSeg] = useState<"Equity" | "Commodities">("Equity");
  const [expiryToday, setExpiryToday] = useState(false);
  return (
    <div className="mt-3 flex gap-2">
      {(["Equity", "Commodities"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setSeg(s)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            seg === s
              ? "bg-primary text-primary-foreground"
              : "border border-primary text-primary"
          }`}
        >
          {s}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setExpiryToday((v) => !v)}
        className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${
          expiryToday
            ? "border-primary bg-primary/15 text-primary"
            : "border-border text-muted-foreground"
        }`}
      >
        Expiry today
      </button>
    </div>
  );
}
