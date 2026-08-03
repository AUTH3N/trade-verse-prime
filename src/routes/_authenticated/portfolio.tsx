import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Filter, MoreVertical, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatINR, formatPct, signedClass } from "@/lib/format";
import { listPositions, type Position } from "@/lib/trading.functions";
import { TradeTicket, type TradeTarget } from "@/components/trade-ticket";
import { instrumentKey, useInstrumentPrices, useLiveQuotes } from "@/hooks/use-live-ticks";
import { expiryCountdown, isExpired } from "@/lib/expiry";

const soon = (what: string) => toast.info(`${what} — coming soon`);

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — Vyro" }] }),
  component: PortfolioPage,
});

const HEADER_SYMBOLS = ["NIFTY", "SENSEX"];

type LivePosition = Position & { expired: boolean; countdown: string };

function PortfolioPage() {
  const [tab, setTab] = useState<"Investments" | "Positions">("Investments");
  const [ticket, setTicket] = useState<{ target: TradeTarget; side: "BUY" | "SELL" } | null>(null);

  const posFn = useServerFn(listPositions);
  const { data: rawPositions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => posFn(),
    refetchInterval: 15000,
  });
  const base = rawPositions ?? [];
  const headerQuotes = useLiveQuotes(HEADER_SYMBOLS);
  // Options are repriced from live spot with Black–Scholes, so premiums decay
  // into expiry and settle at intrinsic value once the contract expires.
  const prices = useInstrumentPrices(base);
  const all: LivePosition[] = base.map((p) => {
    const live = prices[instrumentKey(p)];
    return {
      ...p,
      last_price: live ? live.ltp : p.last_price,
      expired: live ? live.expired : isExpired(p.expiry),
      countdown: expiryCountdown(p.expiry),
    };
  });
  const equity = all.filter((p) => p.instrument_type === "EQ" && p.qty > 0);
  const derivatives = all.filter((p) => p.instrument_type !== "EQ" && p.qty !== 0);


  return (
    <div className="-mt-3 space-y-3">
      <section className="rounded-2xl border border-border bg-surface-1 p-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            {HEADER_SYMBOLS.map((name) => {
              const q = headerQuotes[name];
              return (
                <div key={name}>
                  <div className="text-[11px] font-semibold">{name}</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">
                      {(q?.price ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] tabular-nums ${signedClass(q?.change ?? 0)}`}>
                      {(q?.change ?? 0).toFixed(2)} ({formatPct(q?.changePct ?? 0)})
                    </span>
                  </div>
                </div>
              );
            })}

          </div>
          <button onClick={() => soon("Indices detail")} className="text-primary" aria-label="Expand indices">
            <ChevronDown className="size-5" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 border-b border-border">
        {(["Investments", "Positions"] as const).map((t) => {
          const count = t === "Investments" ? equity.length : derivatives.length;
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

      {tab === "Investments" ? (
        <InvestmentsView holdings={equity} onTrade={(t, side) => setTicket({ target: t, side })} />
      ) : (
        <PositionsView positions={derivatives} onTrade={(t, side) => setTicket({ target: t, side })} />
      )}

      {ticket && (
        <TradeTicket target={ticket.target} side={ticket.side} onClose={() => setTicket(null)} />
      )}
    </div>
  );
}

function InvestmentsView({
  holdings,
  onTrade,
}: {
  holdings: Position[];
  onTrade: (t: TradeTarget, side: "BUY" | "SELL") => void;
}) {
  const invested = holdings.reduce((s, p) => s + p.avg_price * p.qty, 0);
  const current = holdings.reduce((s, p) => s + p.last_price * p.qty, 0);
  const returns = current - invested;
  const returnsPct = invested > 0 ? (returns / invested) * 100 : 0;

  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-8 text-center">
        <div className="text-3xl">📊</div>
        <div className="mt-3 text-base font-semibold">No investments yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Buy your first stock from the watchlist or search to start building your portfolio.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-muted-foreground">Portfolio value</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums">{formatINR(current)}</span>
            <span className={`text-xs ${signedClass(returns)}`}>({formatPct(returnsPct)})</span>
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Invested {formatINR(invested)}</span>
          <span className={signedClass(returns)}>
            {returns >= 0 ? "+" : ""}
            {returns.toFixed(2)}
          </span>
        </div>
      </section>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
        {holdings.map((p) => {
          const pnl = (p.last_price - p.avg_price) * p.qty;
          const pnlPct = p.avg_price > 0 ? ((p.last_price - p.avg_price) / p.avg_price) * 100 : 0;
          return (
            <div key={`${p.symbol}-${p.instrument_type}`} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.symbol}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.qty} Qty · AVG {p.avg_price.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold tabular-nums ${signedClass(pnl)}`}>
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)}
                  </div>
                  <div className={`text-[11px] tabular-nums ${signedClass(pnl)}`}>
                    ({formatPct(pnlPct)})
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  LTP <span className="font-semibold text-foreground tabular-nums">{p.last_price.toFixed(2)}</span>
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      onTrade(
                        {
                          symbol: p.symbol,
                          price: p.last_price,
                          exchange: p.exchange,
                          instrument_type: "EQ",
                        },
                        "BUY",
                      )
                    }
                    className="rounded-md bg-bull/15 px-2.5 py-1 text-[11px] font-semibold text-bull"
                  >
                    BUY
                  </button>
                  <button
                    onClick={() =>
                      onTrade(
                        {
                          symbol: p.symbol,
                          price: p.last_price,
                          exchange: p.exchange,
                          instrument_type: "EQ",
                        },
                        "SELL",
                      )
                    }
                    className="rounded-md bg-bear/15 px-2.5 py-1 text-[11px] font-semibold text-bear"
                  >
                    SELL
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PositionsView({
  positions,
  onTrade,
}: {
  positions: LivePosition[];
  onTrade: (t: TradeTarget, side: "BUY" | "SELL") => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => positions.filter((p) => p.symbol.toLowerCase().includes(q.toLowerCase())),
    [positions, q],
  );
  const open = filtered.filter((p) => !p.expired);
  const expired = filtered.filter((p) => p.expired);
  const totalPnl = positions.reduce((s, p) => s + (p.last_price - p.avg_price) * p.qty, 0);


  if (positions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-8 text-center">
        <div className="text-3xl">🎯</div>
        <div className="mt-3 text-base font-semibold">No open positions</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Trade options or futures from the F&O tab to see positions here.
        </div>
      </div>
    );
  }

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
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search in positions"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button onClick={() => soon("Analyze positions")} className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm">
          <TrendingUp className="size-4" /> Analyze
        </button>
        <button onClick={() => soon("Filter")} className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1" aria-label="Filter">
          <Filter className="size-4" />
        </button>
        <button onClick={() => soon("More options")} className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1" aria-label="More">
          <MoreVertical className="size-4" />
        </button>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
        {filtered.map((p) => {
          const pnl = (p.last_price - p.avg_price) * p.qty;
          const isCE = p.instrument_type === "CE";
          return (
            <div key={`${p.symbol}-${p.strike}-${p.instrument_type}-${p.expiry}`} className="px-4 py-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{p.qty} QTY</span>
                <span>{p.instrument_type}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.symbol}</span>
                  {p.strike && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        isCE ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
                      }`}
                    >
                      {p.strike} {p.instrument_type}
                    </span>
                  )}
                  {p.expiry && <span className="text-[10px] text-muted-foreground">{p.expiry}</span>}
                </div>
                <span className={`text-sm font-semibold tabular-nums ${signedClass(pnl)}`}>
                  {pnl.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {p.exchange} · AVG <span className="text-foreground">{p.avg_price.toFixed(2)}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span>
                    LTP <span className="text-foreground font-semibold tabular-nums">{p.last_price.toFixed(2)}</span>
                  </span>
                  <button
                    onClick={() =>
                      onTrade(
                        {
                          symbol: p.symbol,
                          instrument_type: p.instrument_type as "CE" | "PE" | "EQ",
                          strike: p.strike,
                          expiry: p.expiry,
                          exchange: p.exchange,
                          price: p.last_price,
                        },
                        "SELL",
                      )
                    }
                    className="ml-2 rounded-md bg-bear/15 px-2 py-0.5 text-[10px] font-semibold text-bear"
                  >
                    EXIT
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
