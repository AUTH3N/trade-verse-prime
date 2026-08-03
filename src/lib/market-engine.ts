// Deterministic intraday market engine.
//
// Produces broker-realistic price action for any symbol: a fractal (value-noise)
// random walk anchored to a per-day previous close, with an opening gap, an
// intraday high/low, and volume. The path is a pure function of (symbol, time),
// so the server, the client and every component agree on the same LTP without
// any shared state — and the whole session can be replayed or backtested.
//
// When the exchange is closed the clock is pinned to the last close, so prices
// and P&L freeze exactly like a real terminal after 15:30 IST.

import { getMarketStatus } from "./market-hours";

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
const OPEN_MIN = 9 * 60 + 15;
const CLOSE_MIN = 15 * 60 + 30;
const SESSION_MIN = CLOSE_MIN - OPEN_MIN; // 375

/** Reference last-traded prices used as the simulation anchor. */
export const BASE_PRICES: Record<string, number> = {
  NIFTY: 24812.55,
  BANKNIFTY: 51043.2,
  FINNIFTY: 23110.4,
  MIDCPNIFTY: 12345.6,
  SENSEX: 81344.15,
  RELIANCE: 1298.4,
  TCS: 3145.6,
  HDFCBANK: 1712.35,
  INFY: 1584.9,
  ICICIBANK: 1268.75,
  SBIN: 812.4,
  ITC: 462.15,
  AXISBANK: 1109.6,
  LT: 3620.85,
  BHARTIARTL: 1642.3,
  TATAMOTORS: 742.55,
  WIPRO: 292.4,
  HINDUNILVR: 2418.9,
  MARUTI: 12240.5,
  ADANIENT: 2380.25,
};

/** Annualised volatility used to scale the walk. Indices are calmer than stocks. */
function annualVol(symbol: string) {
  if (symbol === "NIFTY" || symbol === "SENSEX") return 0.13;
  if (symbol === "BANKNIFTY" || symbol === "FINNIFTY" || symbol === "MIDCPNIFTY") return 0.17;
  return 0.28;
}

export function baseIvFor(symbol: string) {
  return annualVol(symbol) * 0.95;
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash2(seed: number, i: number) {
  let h = Math.imul(seed ^ i, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967295;
}

/** Smooth value noise in [0,1]. */
function noise(seed: number, x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash2(seed, i);
  const b = hash2(seed, i + 1);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

/** Fractal noise in roughly [-0.5, 0.5] — gives price action its "market" texture. */
function fbm(seed: number, x: number, octaves = 5) {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    value += amp * (noise(seed + o * 7919, x * freq) - 0.5);
    norm += amp;
    amp *= 0.52;
    freq *= 2.17;
  }
  return value / norm;
}

export function basePriceFor(symbol: string) {
  const known = BASE_PRICES[symbol.toUpperCase()];
  if (known) return known;
  const r = hash2(hashString(symbol.toUpperCase()), 11);
  return +(80 + r * 2600).toFixed(2);
}

function istDayIndex(ms: number) {
  return Math.floor((ms + IST_OFFSET_MS) / 86_400_000);
}

/** Session progress in [0,1] plus whether the clock is frozen. */
function sessionClock(at: number) {
  const status = getMarketStatus(new Date(at));
  const effective = status.open ? at : status.lastCloseMs;
  const ist = new Date(effective + IST_OFFSET_MS);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes() + ist.getUTCSeconds() / 60;
  const progress = Math.min(1, Math.max(0, (minutes - OPEN_MIN) / SESSION_MIN));
  return { day: istDayIndex(effective), progress, frozen: !status.open, status };
}

/** Previous close for a trading day — a slow day-scale random walk around the anchor. */
function prevCloseFor(symbol: string, day: number) {
  const seed = hashString(symbol.toUpperCase());
  const drift = fbm(seed + 101, day / 9, 4) * annualVol(symbol) * 1.6;
  return basePriceFor(symbol) * Math.exp(drift);
}

export type EngineQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
  volume: number;
  frozen: boolean;
  statusLabel: string;
};

function pathPrice(symbol: string, day: number, progress: number) {
  const seed = hashString(symbol.toUpperCase()) + day * 7717;
  const prevClose = prevCloseFor(symbol, day);
  const dayVol = annualVol(symbol) / Math.sqrt(252);
  const gap = (hash2(seed, 3) - 0.5) * dayVol * 0.6;
  const walk = fbm(seed, progress * 7 + 0.5) * 2.2 * dayVol;
  const trend = (hash2(seed, 9) - 0.5) * dayVol * 1.4 * progress;
  return prevClose * Math.exp(gap + walk + trend);
}

/** Full quote for a symbol at a point in time (defaults to now). */
export function quoteAt(symbol: string, at: number = Date.now()): EngineQuote {
  const sym = symbol.toUpperCase();
  const { day, progress, frozen, status } = sessionClock(at);
  const prevClose = prevCloseFor(sym, day);

  const price = pathPrice(sym, day, progress);
  const open = pathPrice(sym, day, 0);

  let high = Math.max(open, price);
  let low = Math.min(open, price);
  const samples = 48;
  for (let i = 1; i < samples; i++) {
    const f = (i / samples) * progress;
    const p = pathPrice(sym, day, f);
    if (p > high) high = p;
    if (p < low) low = p;
  }

  const change = price - prevClose;
  const seed = hashString(sym) + day * 7717;
  const volumeBase = sym.length > 6 ? 3_000_000 : 12_000_000;
  const volume = Math.round(volumeBase * (0.4 + hash2(seed, 21)) * Math.max(progress, 0.05));

  return {
    symbol: sym,
    price: +price.toFixed(2),
    prevClose: +prevClose.toFixed(2),
    open: +open.toFixed(2),
    high: +high.toFixed(2),
    low: +low.toFixed(2),
    change: +change.toFixed(2),
    changePct: +((change / prevClose) * 100).toFixed(2),
    volume,
    frozen,
    statusLabel: status.label,
  };
}

/** Spot LTP only — cheap enough to call for every row on every tick. */
export function spotAt(symbol: string, at: number = Date.now()) {
  const { day, progress } = sessionClock(at);
  return +pathPrice(symbol.toUpperCase(), day, progress).toFixed(2);
}

/** Intraday series for charts: `points` samples from the open up to `at`. */
export function intradaySeries(symbol: string, at: number = Date.now(), points = 78) {
  const { day, progress } = sessionClock(at);
  const sym = symbol.toUpperCase();
  const out: { time: number; value: number }[] = [];
  const dayStartUtc = day * 86_400_000 - IST_OFFSET_MS + OPEN_MIN * 60_000;
  for (let i = 0; i <= points; i++) {
    const f = (i / points) * progress;
    out.push({
      time: Math.round((dayStartUtc + f * SESSION_MIN * 60_000) / 1000),
      value: +pathPrice(sym, day, f).toFixed(2),
    });
  }
  return out;
}
