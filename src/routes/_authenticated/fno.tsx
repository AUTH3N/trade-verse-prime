import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Layers, LineChart, TrendingUp, X } from "lucide-react";
import { formatPct, signedClass } from "@/lib/format";
import { greekTone, ivHeatStyle, oiBarStyle, tickTone } from "@/lib/heat";
import { OptionChart } from "@/components/option-chart";
import { TradeTicket, type TradeTarget } from "@/components/trade-ticket";


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
  { symbol: "NIFTY", spot: 24812.55, chg: 0.54, step: 50, lot: 25 },
  { symbol: "BANKNIFTY", spot: 51043.2, chg: -0.43, step: 100, lot: 15 },
  { symbol: "FINNIFTY", spot: 23110.4, chg: 0.28, step: 50, lot: 25 },
  { symbol: "MIDCPNIFTY", spot: 12345.6, chg: 0.71, step: 25, lot: 50 },
  { symbol: "SENSEX", spot: 81344.15, chg: 0.5, step: 100, lot: 10 },
];


const EXPIRIES = ["27 Nov", "04 Dec", "11 Dec", "25 Dec", "29 Jan"];

type Row = {
  strike: number;
  ceLtp: number; ceChg: number; ceIv: number; ceOi: number; ceVol: number; ceDelta: number;
  peLtp: number; peChg: number; peIv: number; peOi: number; peVol: number; peDelta: number;
  itmCE: boolean; itmPE: boolean;
};

// Deterministic pseudo-random for stable UI mock data.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildChain(spot: number, step: number, seed: number): Row[] {
  const rand = seeded(seed);
  const atm = Math.round(spot / step) * step;
  const strikes = Array.from({ length: 13 }, (_, i) => atm + (i - 6) * step);
  return strikes.map((k) => {
    const moneyCE = Math.max(0, spot - k);
    const movePE = Math.max(0, k - spot);
    const timeVal = step * (1 + rand() * 2);
    const ceLtp = +(moneyCE + timeVal).toFixed(2);
    const peLtp = +(movePE + timeVal).toFixed(2);
    return {
      strike: k,
      ceLtp,
      ceChg: +((rand() - 0.5) * 8).toFixed(2),
      ceIv: +(12 + rand() * 10).toFixed(2),
      ceOi: Math.round(20000 + rand() * 900000),
      ceVol: Math.round(1000 + rand() * 80000),
      ceDelta: +Math.min(0.98, Math.max(0.02, 0.5 + (spot - k) / (step * 20))).toFixed(2),
      peLtp,
      peChg: +((rand() - 0.5) * 8).toFixed(2),
      peIv: +(12 + rand() * 10).toFixed(2),
      peOi: Math.round(20000 + rand() * 900000),
      peVol: Math.round(1000 + rand() * 80000),
      peDelta: +(-Math.min(0.98, Math.max(0.02, 0.5 - (spot - k) / (step * 20)))).toFixed(2),
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
  const rows = useMemo(() => buildChain(u.spot, u.step, u.symbol.length * 31 + expIdx), [u, expIdx]);
  const atm = Math.round(u.spot / u.step) * u.step;

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
            <div className="text-xs text-muted-foreground">{u.symbol} · SPOT</div>
            <div className="mt-0.5 text-2xl font-semibold tabular-nums">
              {u.spot.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-medium tabular-nums ${signedClass(u.chg)}`}>
              {u.chg >= 0 ? "+" : ""}
              {formatPct(u.chg)}
            </div>
          </div>
          <ExpiryPicker value={expIdx} onChange={setExpIdx} />
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
        <OptionChain rows={rows} atm={atm} underlying={u.symbol} expiry={EXPIRIES[expIdx]} lotSize={u.lot} />
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
