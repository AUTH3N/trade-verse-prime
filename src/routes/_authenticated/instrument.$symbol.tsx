import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowLeft,
  Bookmark,
  CandlestickChart,
  ChevronDown,
  LineChart,
  ListOrdered,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatPct, signedClass } from "@/lib/format";
import { PriceChart } from "@/components/price-chart";
import { TradeTicket, type TradeTarget } from "@/components/trade-ticket";
import { useMarketClock } from "@/hooks/use-live-ticks";
import { historySeries, quoteAt, yearRange, type ChartRange } from "@/lib/market-engine";
import { upcomingExpiries, expiryCountdown, yearsToExpiry } from "@/lib/expiry";
import { blackScholes, impliedVol } from "@/lib/option-pricing";
import { baseIvFor } from "@/lib/market-engine";
import { loadPick, savePick, clearPick } from "@/lib/last-pick";

export const Route = createFileRoute("/_authenticated/instrument/$symbol")({
  head: ({ params }) => {
    const sym = params.symbol.toUpperCase();
    return {
      meta: [
        { title: `${sym} price, chart & option chain — Vyro` },
        {
          name: "description",
          content: `Live ${sym} price, intraday and historical charts, F&O snapshot and technicals on Vyro paper trading.`,
        },
        { property: "og:title", content: `${sym} — live chart & F&O | Vyro` },
        {
          property: "og:description",
          content: `Track ${sym} with live charts, market snapshot and paper trading.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: InstrumentPage,
});

const INDEX_META: Record<string, { label: string; exch: string; index: boolean; parts?: string[] }> = {
  NIFTY: {
    label: "Nifty 50",
    exch: "NSE",
    index: true,
    parts: ["RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "ITC", "SBIN", "LT", "BHARTIARTL", "AXISBANK"],
  },
  BANKNIFTY: {
    label: "Nifty Bank",
    exch: "NSE",
    index: true,
    parts: ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "INDUSINDBK", "PNB", "BANKBARODA"],
  },
  FINNIFTY: {
    label: "Nifty Financial Services",
    exch: "NSE",
    index: true,
    parts: ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "BAJFINANCE", "HDFCLIFE"],
  },
  MIDCPNIFTY: { label: "Nifty Midcap Select", exch: "NSE", index: true, parts: ["PNB", "IDFCFIRSTB", "AUBANK"] },
  SENSEX: {
    label: "S&P BSE Sensex",
    exch: "BSE",
    index: true,
    parts: ["RELIANCE", "HDFCBANK", "ICICIBANK", "INFY", "TCS", "ITC", "LT", "SBIN"],
  },
  BANKEX: { label: "S&P BSE Bankex", exch: "BSE", index: true, parts: ["HDFCBANK", "ICICIBANK", "SBIN"] },
};

const TABS = ["Overview", "Constituents", "F&O", "Technicals"] as const;
type Tab = (typeof TABS)[number];
const RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

function metaFor(symbol: string) {
  return (
    INDEX_META[symbol] ?? {
      label: `${symbol} Ltd`,
      exch: "NSE",
      index: false,
      parts: undefined,
    }
  );
}

function InstrumentPage() {
  const { symbol: raw } = Route.useParams();
  const symbol = raw.toUpperCase();
  const navigate = useNavigate();
  const meta = metaFor(symbol);

  const { now } = useMarketClock(1000);
  const quote = useMemo(() => quoteAt(symbol, now), [symbol, now]);

  const [tab, setTab] = useState<Tab>("Overview");
  const [range, setRange] = useState<ChartRange>("1M");
  const [mode, setMode] = useState<"area" | "candles">("area");
  const [snapshotOpen, setSnapshotOpen] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [ticket, setTicket] = useState<{
    target: TradeTarget;
    side: "BUY" | "SELL";
    limitPrice?: number;
  } | null>(null);
  const [pickedPrice, setPickedPrice] = useState<number | null>(null);
  const [pickedSide, setPickedSide] = useState<"BUY" | "SELL">("BUY");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(localStorage.getItem(`vyro:wl:${symbol}`) === "1");
    const remembered = loadPick(symbol);
    setPickedPrice(remembered?.price ?? null);
    setPickedSide(remembered?.side ?? "BUY");
  }, [symbol]);

  function pickAndTrade(side: "BUY" | "SELL", price: number) {
    savePick(symbol, price, side);
    setPickedSide(side);
    setPickedPrice(price);
    setTicket({ target, side, limitPrice: price });
  }


  // Chart data refreshes on a slower cadence than the ticking header.
  const bucket = Math.floor(now / 15_000);
  const candles = useMemo(
    () => historySeries(symbol, range, bucket * 15_000),
    [symbol, range, bucket],
  );
  const yr = useMemo(() => yearRange(symbol, bucket * 15_000), [symbol, bucket]);

  const first = candles[0]?.close ?? quote.prevClose;
  const rangeReturn = first > 0 ? ((quote.price - first) / first) * 100 : 0;
  const bullish = quote.change >= 0;

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    if (next) localStorage.setItem(`vyro:wl:${symbol}`, "1");
    else localStorage.removeItem(`vyro:wl:${symbol}`);
    toast.success(next ? `${symbol} added to watchlist` : `${symbol} removed from watchlist`);
  }

  const target: TradeTarget = {
    symbol,
    instrument_type: "EQ",
    exchange: meta.exch,
    price: quote.price,
  };

  return (
    <div className="-mt-3 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={() => window.history.length > 1 ? window.history.back() : navigate({ to: "/home" })}
            className="grid size-9 place-items-center rounded-full text-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-4">
            <Link to="/fno" className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <ListOrdered className="size-4" /> Option Chain
            </Link>
            <button
              type="button"
              onClick={toggleSaved}
              className="flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} /> Watchlist
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <div className="text-xl font-semibold">{symbol}</div>
            <div className="text-xs text-muted-foreground">{meta.label}</div>
            <div className="text-xs text-muted-foreground">{meta.exch}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold tabular-nums">
              {quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-medium tabular-nums ${signedClass(quote.change)}`}>
              {quote.change >= 0 ? "+" : ""}
              {quote.change.toFixed(2)}
            </div>
            <div className={`text-xs tabular-nums ${signedClass(quote.change)}`}>
              ({formatPct(quote.changePct)})
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-4 flex gap-6 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative whitespace-nowrap py-3 text-sm transition ${
              tab === t ? "font-semibold text-primary" : "text-muted-foreground"
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-5 pt-4">
          <section>
            <div className="flex items-center justify-end gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              {range} RETURN
              <span className={signedClass(rangeReturn)}>{formatPct(rangeReturn)}</span>
            </div>
            <div className="mt-2">
              <PriceChart
                candles={candles}
                mode={mode}
                bullish={bullish}
                height={260}
                onPricePick={(p) => {
                  setPickedPrice(p);
                  savePick(symbol, p, pickedSide);
                }}
              />
            </div>
            {pickedPrice != null ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2">
                <div className="flex-1 text-xs text-muted-foreground">
                  Selected price
                  <span className="ml-1 font-semibold tabular-nums text-foreground">
                    ₹{pickedPrice.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pickAndTrade("BUY", pickedPrice);
                  }}
                  className="rounded-lg bg-bull px-3 py-1.5 text-xs font-bold text-white"
                >
                  BUY @ limit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pickAndTrade("SELL", pickedPrice);
                  }}
                  className="rounded-lg bg-bear px-3 py-1.5 text-xs font-bold text-white"
                >
                  SELL @ limit
                </button>
                <button
                  type="button"
                  aria-label="Clear selected price"
                  onClick={() => {
                    clearPick(symbol);
                    setPickedPrice(null);
                  }}
                  className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="mt-2 text-center text-[11px] text-muted-foreground">
                Tap anywhere on the chart to pick a price for a limit order
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center justify-between">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      range === r
                        ? "bg-surface-2 font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label={mode === "area" ? "Show candles" : "Show line"}
                onClick={() => setMode((m) => (m === "area" ? "candles" : "area"))}
                className={`grid size-9 place-items-center rounded-lg border ${
                  mode === "candles" ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {mode === "candles" ? (
                  <CandlestickChart className="size-4" />
                ) : (
                  <LineChart className="size-4" />
                )}
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={() => setAlertOpen(true)}
            className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-3 border-y border-border px-4 py-3.5 text-left"
          >
            <AlarmClock className="size-5 text-primary" />
            <span className="text-sm">Set alert</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setTicket({ target, side: pickedSide, limitPrice: pickedPrice ?? undefined })
            }
            className="relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-border bg-surface-1 p-4 text-left"
          >
            <div>
              <div className="text-base font-semibold">Trade from Charts</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {symbol} · {meta.exch} · LTP ₹{quote.price.toFixed(2)}
              </div>
            </div>
            <CandlestickChart className="size-8 text-bull" />
          </button>


          <section>
            <button
              type="button"
              onClick={() => setSnapshotOpen((s) => !s)}
              className="flex w-full items-center justify-between"
            >
              <span className="text-sm font-semibold text-primary">Live market snapshot</span>
              <ChevronDown
                className={`size-5 text-primary transition ${snapshotOpen ? "rotate-180" : ""}`}
              />
            </button>
            {snapshotOpen && (
              <div className="mt-4 space-y-5">
                <RangeBar
                  lowLabel="Today's low"
                  highLabel="Today's high"
                  low={quote.low}
                  high={quote.high}
                  value={quote.price}
                />
                <RangeBar
                  lowLabel="52 weeks low"
                  highLabel="52 weeks high"
                  low={yr.low}
                  high={yr.high}
                  value={quote.price}
                />
                <div className="flex items-start justify-between text-sm">
                  <div>
                    <div className="text-muted-foreground">Open</div>
                    <div className="mt-1 tabular-nums">{quote.open.toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Prev. close</div>
                    <div className="mt-1 tabular-nums">{quote.prevClose.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-start justify-between text-sm">
                  <div>
                    <div className="text-muted-foreground">Volume</div>
                    <div className="mt-1 tabular-nums">{quote.volume.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Status</div>
                    <div className="mt-1">{quote.statusLabel}</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "Constituents" && <Constituents symbol={symbol} parts={meta.parts} now={now} />}
      {tab === "F&O" && <FnoTab symbol={symbol} spot={quote.price} now={now} onTrade={setTicket} />}
      {tab === "Technicals" && <Technicals candles={candles} price={quote.price} />}

      {/* Sticky trade bar */}
      <div className="fixed inset-x-0 bottom-[62px] z-30 border-t border-border bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setTicket({ target, side: "BUY", limitPrice: pickedPrice ?? undefined })}
            className="flex-1 rounded-xl bg-bull py-3 text-sm font-semibold text-white"
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setTicket({ target, side: "SELL", limitPrice: pickedPrice ?? undefined })}
            className="flex-1 rounded-xl bg-bear py-3 text-sm font-semibold text-white"
          >
            SELL
          </button>
        </div>
      </div>

      {alertOpen && (
        <AlertSheet symbol={symbol} price={quote.price} onClose={() => setAlertOpen(false)} />
      )}
      {ticket && (
        <TradeTicket
          target={ticket.target}
          side={ticket.side}
          limitPrice={ticket.limitPrice}
          onClose={() => setTicket(null)}
        />

      )}
    </div>
  );
}

function RangeBar({
  lowLabel,
  highLabel,
  low,
  high,
  value,
}: {
  lowLabel: string;
  highLabel: string;
  low: number;
  high: number;
  value: number;
}) {
  const span = Math.max(high - low, 0.0001);
  const pos = Math.min(100, Math.max(0, ((value - low) / span) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between text-sm tabular-nums">
        <span>{low.toFixed(2)}</span>
        <span>{high.toFixed(2)}</span>
      </div>
      <div className="relative mt-3 h-1.5 rounded-full bg-surface-2">
        <div
          className="absolute -top-1 size-1.5 -translate-x-1/2 rounded-full bg-bull"
          style={{ left: `${pos}%` }}
        />
        <div
          className="absolute top-2 size-0 -translate-x-1/2 border-x-[6px] border-b-[8px] border-x-transparent border-b-bull"
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  );
}

function Constituents({
  symbol,
  parts,
  now,
}: {
  symbol: string;
  parts?: string[];
  now: number;
}) {
  const list = parts ?? ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN"];
  const title = parts ? "Index constituents" : "Peers in the same sector";
  return (
    <div className="pt-4">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface-1">
        {list
          .filter((s) => s !== symbol)
          .map((s) => {
            const q = quoteAt(s, now);
            return (
              <Link
                key={s}
                to="/instrument/$symbol"
                params={{ symbol: s }}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-2"
              >
                <div className="text-sm font-semibold">{s}</div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">{q.price.toFixed(2)}</div>
                  <div className={`text-xs tabular-nums ${signedClass(q.change)}`}>
                    {q.change >= 0 ? "+" : ""}
                    {q.change.toFixed(2)} ({formatPct(q.changePct)})
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

function FnoTab({
  symbol,
  spot,
  now,
  onTrade,
}: {
  symbol: string;
  spot: number;
  now: number;
  onTrade: (t: { target: TradeTarget; side: "BUY" | "SELL" }) => void;
}) {
  const expiries = useMemo(() => upcomingExpiries(now, 3, 1), [now]);
  const [expiryIdx, setExpiryIdx] = useState(0);
  const expiry = expiries[Math.min(expiryIdx, expiries.length - 1)];
  const step = spot > 20000 ? 100 : spot > 2000 ? 50 : 10;
  const atm = Math.round(spot / step) * step;
  const strikes = [atm - step, atm, atm + step];
  const years = Math.max(yearsToExpiry(expiry?.value, now), 1e-6);
  const iv = impliedVol(spot, atm, years, baseIvFor(symbol));

  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {expiries.map((e, i) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setExpiryIdx(i)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              i === expiryIdx
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Expires in {expiryCountdown(expiry?.value, now)} · ATM IV {(iv * 100).toFixed(1)}%
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
        <div className="grid grid-cols-3 border-b border-border px-4 py-2 text-[11px] font-semibold text-muted-foreground">
          <span>CALL</span>
          <span className="text-center">STRIKE</span>
          <span className="text-right">PUT</span>
        </div>
        {strikes.map((k) => {
          const ce = blackScholes("CE", spot, k, iv, years);
          const pe = blackScholes("PE", spot, k, iv, years);
          const lot = symbol === "BANKNIFTY" ? 15 : 25;
          return (
            <div key={k} className="grid grid-cols-3 items-center border-b border-border last:border-0 px-4 py-3">
              <button
                type="button"
                onClick={() =>
                  onTrade({
                    target: { symbol, instrument_type: "CE", strike: k, expiry: expiry?.value, price: +ce.price.toFixed(2), lotSize: lot, exchange: "NSE" },
                    side: "BUY",
                  })
                }
                className="text-left text-sm font-semibold tabular-nums text-bull"
              >
                {ce.price.toFixed(2)}
              </button>
              <div className={`text-center text-sm font-semibold ${k === atm ? "text-primary" : ""}`}>
                {k}
              </div>
              <button
                type="button"
                onClick={() =>
                  onTrade({
                    target: { symbol, instrument_type: "PE", strike: k, expiry: expiry?.value, price: +pe.price.toFixed(2), lotSize: lot, exchange: "NSE" },
                    side: "BUY",
                  })
                }
                className="text-right text-sm font-semibold tabular-nums text-bear"
              >
                {pe.price.toFixed(2)}
              </button>
            </div>
          );
        })}
      </div>

      <Link
        to="/fno"
        className="block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground"
      >
        Open full option chain
      </Link>
    </div>
  );
}

function Technicals({ candles, price }: { candles: Array<{ high: number; low: number; close: number }>; price: number }) {
  const last = candles[candles.length - 1];
  const pivot = last ? (last.high + last.low + last.close) / 3 : price;
  const r1 = 2 * pivot - (last?.low ?? price);
  const s1 = 2 * pivot - (last?.high ?? price);
  const closes = candles.map((c) => c.close);
  const sma = (n: number) =>
    closes.length >= n ? closes.slice(-n).reduce((a, b) => a + b, 0) / n : closes.reduce((a, b) => a + b, 0) / Math.max(closes.length, 1);
  const gains = closes.slice(1).map((c, i) => c - closes[i]);
  const up = gains.filter((g) => g > 0);
  const down = gains.filter((g) => g < 0);
  const avgUp = up.length ? up.reduce((a, b) => a + b, 0) / gains.length : 0;
  const avgDown = down.length ? Math.abs(down.reduce((a, b) => a + b, 0)) / gains.length : 0;
  const rsi = avgDown === 0 ? 100 : 100 - 100 / (1 + avgUp / avgDown);
  const bias = price > sma(20) ? "Bullish" : "Bearish";

  const rows = [
    { label: "RSI (14)", value: rsi.toFixed(1) },
    { label: "SMA 20", value: sma(20).toFixed(2) },
    { label: "SMA 50", value: sma(50).toFixed(2) },
    { label: "Pivot", value: pivot.toFixed(2) },
    { label: "Resistance R1", value: r1.toFixed(2) },
    { label: "Support S1", value: s1.toFixed(2) },
  ];

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="text-xs text-muted-foreground">Trend bias (vs 20-period average)</div>
        <div className={`mt-1 text-lg font-bold ${bias === "Bullish" ? "text-bull" : "text-bear"}`}>
          {bias}
        </div>
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-surface-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground">
        Indicators are derived from the selected chart range on the simulated engine.
      </div>
    </div>
  );
}

function AlertSheet({
  symbol,
  price,
  onClose,
}: {
  symbol: string;
  price: number;
  onClose: () => void;
}) {
  const [value, setValue] = useState(price.toFixed(2));
  const [dir, setDir] = useState<"above" | "below">("above");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface-1 p-4 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Set alert · {symbol}</div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {(["above", "below"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDir(d)}
              className={`flex-1 rounded-xl border py-2 text-sm font-semibold capitalize ${
                dir === d ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs text-muted-foreground" htmlFor="alert-price">
          Trigger price
        </label>
        <input
          id="alert-price"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm tabular-nums outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) {
              toast.error("Enter a valid price");
              return;
            }
            const alerts = JSON.parse(localStorage.getItem("vyro:alerts") ?? "[]");
            alerts.push({ symbol, dir, price: n, createdAt: Date.now() });
            localStorage.setItem("vyro:alerts", JSON.stringify(alerts));
            toast.success(`Alert set: ${symbol} ${dir} ₹${n.toFixed(2)}`);
            onClose();
          }}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Create alert
        </button>
      </div>
    </div>
  );
}
