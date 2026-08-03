import { useEffect, useMemo, useState } from "react";
import { getMarketStatus } from "@/lib/market-hours";
import { quoteAt, spotAt, type EngineQuote } from "@/lib/market-engine";
import { blackScholes, impliedVol, type OptionType } from "@/lib/option-pricing";
import { isExpired, yearsToExpiry } from "@/lib/expiry";
import { baseIvFor } from "@/lib/market-engine";

/**
 * Ticking wall clock. While the exchange is open it advances every
 * `intervalMs`; once closed it settles on the last close so every derived
 * price freezes (matches real broker behaviour after 15:30 IST).
 */
export function useMarketClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  const status = getMarketStatus(new Date(now));
  return { now: status.open ? now : status.lastCloseMs, live: status.open, status };
}

/** Live spot LTP per symbol. */
export function useSpotPrices(symbols: string[], intervalMs = 1000): Record<string, number> {
  const { now } = useMarketClock(intervalMs);
  const key = symbols.join(",");
  return useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of key ? key.split(",") : []) out[s] = spotAt(s, now);
    return out;
  }, [key, now]);
}

/** Full live quotes (open/high/low/volume/change) per symbol. */
export function useLiveQuotes(symbols: string[], intervalMs = 1000): Record<string, EngineQuote> {
  const { now } = useMarketClock(intervalMs);
  const key = symbols.join(",");
  return useMemo(() => {
    const out: Record<string, EngineQuote> = {};
    for (const s of key ? key.split(",") : []) out[s] = quoteAt(s, now);
    return out;
  }, [key, now]);
}

export type PricedInstrument = {
  symbol: string;
  instrument_type: string;
  strike?: number | null;
  expiry?: string | null;
};

export type LivePrice = {
  ltp: number;
  spot: number;
  prevClose: number;
  change: number;
  changePct: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  expired: boolean;
  daysLeft: number | null;
};

export function priceInstrument(inst: PricedInstrument, now: number): LivePrice {
  const q = quoteAt(inst.symbol, now);

  if (inst.instrument_type !== "CE" && inst.instrument_type !== "PE") {
    return {
      ltp: q.price,
      spot: q.price,
      prevClose: q.prevClose,
      change: q.change,
      changePct: q.changePct,
      iv: 0,
      delta: 1,
      gamma: 0,
      theta: 0,
      vega: 0,
      expired: false,
      daysLeft: null,
    };
  }

  const type = inst.instrument_type as OptionType;
  const strike = Number(inst.strike ?? q.price);
  const expired = isExpired(inst.expiry, now);
  const years = expired ? 0 : yearsToExpiry(inst.expiry, now);
  const iv = impliedVol(q.price, strike, Math.max(years, 1e-6), baseIvFor(inst.symbol));
  const g = blackScholes(type, q.price, strike, iv, years);

  // Yesterday's premium, same strike/expiry — gives a real intraday % change.
  const prevYears = expired ? 0 : yearsToExpiry(inst.expiry, now - 86_400_000);
  const prev = blackScholes(type, q.prevClose, strike, iv, Math.max(prevYears, 0));
  const change = g.price - prev.price;

  return {
    ltp: g.price,
    spot: q.price,
    prevClose: prev.price,
    change: +change.toFixed(2),
    changePct: prev.price > 0 ? +((change / prev.price) * 100).toFixed(2) : 0,
    iv: +(iv * 100).toFixed(2),
    delta: g.delta,
    gamma: g.gamma,
    theta: g.theta,
    vega: g.vega,
    expired,
    daysLeft: expired ? 0 : years * 365,
  };
}

/**
 * Live, expiry-aware prices for a set of instruments. Options are repriced from
 * the live spot with Black–Scholes, so premiums decay into expiry and settle at
 * intrinsic value once the contract expires.
 */
export function useInstrumentPrices(
  instruments: PricedInstrument[],
  intervalMs = 1000,
): Record<string, LivePrice> {
  const { now } = useMarketClock(intervalMs);
  const key = instruments
    .map((i) => `${i.symbol}|${i.instrument_type}|${i.strike ?? ""}|${i.expiry ?? ""}`)
    .join(";");

  return useMemo(() => {
    const out: Record<string, LivePrice> = {};
    for (const k of key ? key.split(";") : []) {
      const [symbol, instrument_type, strike, expiry] = k.split("|");
      out[k] = priceInstrument(
        { symbol, instrument_type, strike: strike ? Number(strike) : null, expiry: expiry || null },
        now,
      );
    }
    return out;
  }, [key, now]);
}

export function instrumentKey(i: PricedInstrument) {
  return `${i.symbol}|${i.instrument_type}|${i.strike ?? ""}|${i.expiry ?? ""}`;
}

/**
 * @deprecated Use `useInstrumentPrices` — kept for callers that only need a
 * multiplier around their own reference price.
 */
export function useLiveTicks(keys: string[], intervalMs = 1000) {
  const { now } = useMarketClock(intervalMs);
  const key = keys.join(";");
  return useMemo(() => {
    const ticks: Record<string, number> = {};
    for (const k of key ? key.split(";") : []) {
      const symbol = k.split("|")[0];
      const q = quoteAt(symbol, now);
      ticks[k] = q.prevClose > 0 ? q.price / q.prevClose : 1;
    }
    return ticks;
  }, [key, now]);
}
