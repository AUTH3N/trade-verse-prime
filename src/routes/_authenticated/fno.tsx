import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Layers, LineChart, TrendingUp, X } from "lucide-react";
import { formatPct, signedClass } from "@/lib/format";
import { greekTone, ivHeatStyle, oiBarStyle, tickTone } from "@/lib/heat";
import { OptionChart } from "@/components/option-chart";
import { TradeTicket, type TradeTarget } from "@/components/trade-ticket";
import { useLiveQuotes, useMarketClock } from "@/hooks/use-live-ticks";
import { baseIvFor } from "@/lib/market-engine";
import { blackScholes, impliedVol } from "@/lib/option-pricing";
import { expiryCountdown, upcomingExpiries, yearsToExpiry, type ExpiryInfo } from "@/lib/expiry";



export const Route = createFileRoute("/_authenticated/fno")({
  head: () => ({
    meta: [
      { title: "F&O — Vyro" },
      { name: "description", content: "Option chain, Greeks and strategy builder for NIFTY, BANKNIFTY and F&O stocks." },
    ],
  }),
  component: FnOPage,
});

const UNDERLYINGS = [
  { symbol: "NIFTY", step: 50, lot: 25 },
  { symbol: "BANKNIFTY", step: 100, lot: 15 },
  { symbol: "FINNIFTY", step: 50, lot: 25 },
  { symbol: "MIDCPNIFTY", step: 25, lot: 50 },
  { symbol: "SENSEX", step: 100, lot: 10 },
];

type Row = {
  strike: number;
  ceLtp: number; ceChg: number; ceIv: number; ceOi: number; ceVol: number; ceDelta: number;
  peLtp: number; peChg: number; peIv: number; peOi: number; peVol: number; peDelta: number;
  itmCE: boolean; itmPE: boolean;
};

// Deterministic pseudo-random for stable OI/volume depth.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Live option chain: every premium and Greek is Black–Scholes priced off the
 * live spot and the selected expiry, so the chain decays as expiry approaches
 * and reprices tick-by-tick with the underlying.
 */
function buildChain(
  symbol: string,
  spot: number,
  prevClose: number,
  step: number,
  years: number,
  seed: number,
): Row[] {
  const rand = seeded(seed);
  const atm = Math.round(spot / step) * step;
  const strikes = Array.from({ length: 13 }, (_, i) => atm + (i - 6) * step);
  const baseIv = baseIvFor(symbol);
  const prevYears = Math.max(years + 1 / 365, 0);

  return strikes.map((k) => {
    const ivCe = impliedVol(spot, k, Math.max(years, 1e-6), baseIv);
    const ivPe = impliedVol(spot, k, Math.max(years, 1e-6), baseIv * 1.04); // put skew
    const ce = blackScholes("CE", spot, k, ivCe, years);
    const pe = blackScholes("PE", spot, k, ivPe, years);
    const cePrev = blackScholes("CE", prevClose, k, ivCe, prevYears);
    const pePrev = blackScholes("PE", prevClose, k, ivPe, prevYears);
    // Open interest clusters around round strikes and thins out in the wings.
    const distance = Math.abs(k - atm) / step;
    const cluster = Math.exp(-(distance * distance) / 18) * (0.6 + rand() * 0.8);

    return {
      strike: k,
      ceLtp: ce.price,
      ceChg: +(ce.price - cePrev.price).toFixed(2),
      ceIv: +(ivCe * 100).toFixed(2),
      ceOi: Math.round(1_400_000 * cluster * (k >= atm ? 1.15 : 0.8)),
      ceVol: Math.round(120_000 * cluster * (0.5 + rand())),
      ceDelta: +ce.delta.toFixed(2),
      peLtp: pe.price,
      peChg: +(pe.price - pePrev.price).toFixed(2),
      peIv: +(ivPe * 100).toFixed(2),
      peOi: Math.round(1_400_000 * cluster * (k <= atm ? 1.15 : 0.8)),
      peVol: Math.round(120_000 * cluster * (0.5 + rand())),
      peDelta: +pe.delta.toFixed(2),
      itmCE: k < spot,
      itmPE: k > spot,
    };
  });
}

const STRATEGY_PRESETS = [
  { name: "Long Call", legs: "Buy 1 CE ATM", tag: "Bullish" },
  { name: "Long Put", legs: "Buy 1 PE ATM", tag: "Bearish" },
  { name: "Bull Call Spread", legs: "Buy CE + Sell higher CE", tag: "Bullish" },
  { name: "Bear Put Spread", legs: "Buy PE + Sell lower PE", tag: "Bearish" },
  { name: "Iron Condor", legs: "Sell OTM CE+PE, Buy wings", tag: "Neutral" },
  { name: "Short Straddle", legs: "Sell ATM CE + PE", tag: "Neutral" },
  { name: "Long Straddle", legs: "Buy ATM CE + PE", tag: "Volatility" },
  { name: "Butterfly", legs: "1-2-1 CE / PE", tag: "Pinning" },
];

function FnOPage() {
  const [uIdx, setUIdx] = useState(0);
  const [expIdx, setExpIdx] = useState(0);
  const [tab, setTab] = useState<"chain" | "strategy">("chain");

  const u = UNDERLYINGS[uIdx];
  const { now, live, status } = useMarketClock(1000);
  const expiries = useMemo(() => upcomingExpiries(now), [Math.floor(now / 3_600_000)]);
  const expiry = expiries[Math.min(expIdx, expiries.length - 1)];
  const quotes = useLiveQuotes([u.symbol]);
  const q = quotes[u.symbol];
  const spot = q?.price ?? 0;
  const years = expiry ? yearsToExpiry(expiry.value, now) : 0;

  const rows = useMemo(
    () => (spot > 0 ? buildChain(u.symbol, spot, q.prevClose, u.step, years, u.symbol.length * 31 + expIdx) : []),
    [u.symbol, u.step, spot, q?.prevClose, years, expIdx],
  );
  const atm = Math.round(spot / u.step) * u.step;

  return (
    <div className="space-y-4">
      {/* Underlying chip strip — Kotak Neo style */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {UNDERLYINGS.map((x, i) => {
            const active = i === uIdx;
            return (
              <button
                key={x.symbol}
                type="button"
                onClick={() => setUIdx(i)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface-1 text-muted-foreground hover:text-foreground"
                }`}
              >
                {x.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spot header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-2 p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{u.symbol} · SPOT</span>
              <span
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  live ? "bg-bull/15 text-bull" : "bg-muted text-muted-foreground"
                }`}
              >
                <span className={`size-1.5 rounded-full ${live ? "bg-bull" : "bg-muted-foreground"}`} />
                {live ? "LIVE" : "CLOSED"}
              </span>
            </div>
            <div className="mt-0.5 text-2xl font-semibold tabular-nums">
              {spot.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-medium tabular-nums ${signedClass(q?.change ?? 0)}`}>
              {(q?.change ?? 0) >= 0 ? "+" : ""}
              {(q?.change ?? 0).toFixed(2)} ({formatPct(q?.changePct ?? 0)})
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              O {q?.open.toFixed(2)} · H {q?.high.toFixed(2)} · L {q?.low.toFixed(2)} · {status.label}
            </div>
          </div>
          <div className="text-right">
            <ExpiryPicker value={expIdx} onChange={setExpIdx} expiries={expiries} />
            {expiry && (
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {expiryCountdown(expiry.value, now)}
                {expiry.monthly ? " · Monthly" : " · Weekly"}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Segmented control */}
      <div className="inline-flex rounded-xl border border-border bg-surface-1 p-1">
        <SegBtn active={tab === "chain"} onClick={() => setTab("chain")} icon={Layers}>
          Option chain
        </SegBtn>
        <SegBtn active={tab === "strategy"} onClick={() => setTab("strategy")} icon={TrendingUp}>
          Strategy builder
        </SegBtn>
      </div>

      {tab === "chain" ? (
        <OptionChain
          rows={rows}
          atm={atm}
          underlying={u.symbol}
          expiry={expiry?.value ?? ""}
          expiryLabel={expiry?.label ?? ""}
          lotSize={u.lot}
        />

      ) : (

        <StrategyBuilder underlying={u.symbol} />
      )}
    </div>
  );
}

function SegBtn({
  children,
  active,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}

function ExpiryPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <label className="relative inline-flex items-center gap-1 rounded-lg border border-border bg-surface-1 px-2.5 py-1.5 text-xs font-semibold">
      <span className="text-muted-foreground">Expiry</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none bg-transparent pr-4 text-foreground outline-none"
      >
        {EXPIRIES.map((e, i) => (
          <option key={e} value={i} className="bg-surface-1 text-foreground">
            {e}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </label>
  );
}

function OptionChain({ rows, atm, underlying, expiry, lotSize }: { rows: Row[]; atm: number; underlying: string; expiry: string; lotSize: number }) {
  const [open, setOpen] = useState<{ strike: number; side: "ce" | "pe"; ltp: number; chg: number } | null>(null);
  const [ticket, setTicket] = useState<{ target: TradeTarget; side: "BUY" | "SELL" } | null>(null);
  const maxOi = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.ceOi, r.peOi), 0),
    [rows],
  );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-surface-2/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="text-center">Calls</div>
          <div className="px-4 text-center">Strike</div>
          <div className="text-center">Puts</div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] text-[11px] tabular-nums">
          <HeaderRow side="ce" />
          <div />
          <HeaderRow side="pe" />
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <ChainRow
              key={r.strike}
              row={r}
              isAtm={r.strike === atm}
              maxOi={maxOi}
              onOpen={(side) =>
                setOpen({
                  strike: r.strike,
                  side,
                  ltp: side === "ce" ? r.ceLtp : r.peLtp,
                  chg: side === "ce" ? r.ceChg : r.peChg,
                })
              }
            />
          ))}
        </div>
      </div>

      {open && (
        <div className="rounded-2xl border border-border bg-surface-1 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  open.side === "ce" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
                }`}
              >
                {open.side.toUpperCase()} · {open.strike}
              </span>
              <span className="text-sm font-semibold tabular-nums" style={tickTone(open.chg)}>
                ₹{open.ltp.toFixed(2)}
              </span>
              <span className="text-[11px] font-medium tabular-nums" style={tickTone(open.chg)}>
                {open.chg >= 0 ? "+" : ""}
                {open.chg.toFixed(2)}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Close chart"
            >
              <X className="size-4" />
            </button>
          </div>
          <OptionChart
            key={`${open.side}-${open.strike}`}
            seed={open.strike * 7 + (open.side === "ce" ? 1 : 2)}
            base={open.ltp}
            bullish={open.chg >= 0}
            height={220}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setTicket({
                  target: {
                    symbol: underlying,
                    instrument_type: open.side === "ce" ? "CE" : "PE",
                    strike: open.strike,
                    expiry,
                    exchange: "NSE",
                    price: open.ltp,
                    lotSize,
                  },
                  side: "BUY",
                })
              }
              className="rounded-lg bg-bull py-2 text-sm font-bold text-white"
            >
              BUY
            </button>
            <button
              onClick={() =>
                setTicket({
                  target: {
                    symbol: underlying,
                    instrument_type: open.side === "ce" ? "CE" : "PE",
                    strike: open.strike,
                    expiry,
                    exchange: "NSE",
                    price: open.ltp,
                    lotSize,
                  },
                  side: "SELL",
                })
              }
              className="rounded-lg bg-bear py-2 text-sm font-bold text-white"
            >
              SELL
            </button>
          </div>
        </div>
      )}

      {ticket && (
        <TradeTicket target={ticket.target} side={ticket.side} onClose={() => setTicket(null)} />
      )}
    </div>
  );
}


function HeaderRow({ side }: { side: "ce" | "pe" }) {
  const cols = side === "ce"
    ? ["OI", "IV", "LTP", "Δ"]
    : ["Δ", "LTP", "IV", "OI"];
  return (
    <div
      className={`grid grid-cols-4 gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${
        side === "ce" ? "text-left" : "text-right"
      }`}
    >
      {cols.map((c) => (
        <span key={c} className="text-center">{c}</span>
      ))}
    </div>
  );
}

function ChainRow({
  row,
  isAtm,
  maxOi,
  onOpen,
}: {
  row: Row;
  isAtm: boolean;
  maxOi: number;
  onOpen: (side: "ce" | "pe") => void;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center text-[11px] tabular-nums ${
        isAtm ? "bg-primary/10" : ""
      }`}
    >
      {/* CE side — click to open chart */}
      <button
        type="button"
        onClick={() => onOpen("ce")}
        style={oiBarStyle(row.ceOi, maxOi, "ce")}
        className={`group grid grid-cols-4 gap-1 px-3 py-2 text-left transition hover:bg-bull/10 ${
          row.itmCE ? "bg-bull/[0.06]" : ""
        }`}
      >
        <span className="text-center text-[10.5px] text-muted-foreground">{fmtOi(row.ceOi)}</span>
        <span className="rounded text-center" style={ivHeatStyle(row.ceIv)}>
          {row.ceIv.toFixed(1)}
        </span>
        <span className="flex items-center justify-center gap-0.5 font-semibold" style={tickTone(row.ceChg)}>
          <LineChart className="size-2.5 opacity-0 transition group-hover:opacity-60" />
          {row.ceLtp.toFixed(2)}
        </span>
        <span className="text-center font-medium" style={greekTone(row.ceDelta)}>
          {row.ceDelta.toFixed(2)}
        </span>
      </button>

      {/* Strike */}
      <div className={`px-3 py-2 text-center text-xs font-bold ${isAtm ? "text-primary" : "text-foreground"}`}>
        {row.strike}
      </div>

      {/* PE side */}
      <button
        type="button"
        onClick={() => onOpen("pe")}
        style={oiBarStyle(row.peOi, maxOi, "pe")}
        className={`group grid grid-cols-4 gap-1 px-3 py-2 text-left transition hover:bg-bear/10 ${
          row.itmPE ? "bg-bear/[0.06]" : ""
        }`}
      >
        <span className="text-center font-medium" style={greekTone(row.peDelta)}>
          {row.peDelta.toFixed(2)}
        </span>
        <span className="flex items-center justify-center gap-0.5 font-semibold" style={tickTone(row.peChg)}>
          <LineChart className="size-2.5 opacity-0 transition group-hover:opacity-60" />
          {row.peLtp.toFixed(2)}
        </span>
        <span className="rounded text-center" style={ivHeatStyle(row.peIv)}>
          {row.peIv.toFixed(1)}
        </span>
        <span className="text-center text-[10.5px] text-muted-foreground">{fmtOi(row.peOi)}</span>
      </button>
    </div>
  );
}

function fmtOi(n: number) {
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function StrategyBuilder({ underlying }: { underlying: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="text-xs text-muted-foreground">Building on</div>
        <div className="text-lg font-semibold">{underlying}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Pick a preset to auto-populate legs. Payoff, Greeks and margin will simulate in the trade ticket.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STRATEGY_PRESETS.map((s) => (
          <button
            key={s.name}
            type="button"
            className="rounded-xl border border-border bg-surface-1 p-3 text-left transition hover:border-primary/60 hover:bg-surface-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{s.name}</div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {s.tag}
              </span>
            </div>
            <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.legs}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
