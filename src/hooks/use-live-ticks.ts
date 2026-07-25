import { useEffect, useState } from "react";
import { getMarketStatus } from "@/lib/market-hours";

// Deterministic per-symbol seed
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns a live oscillating multiplier per symbol key.
 * When the Indian market is closed, ticks FREEZE at the last-close snapshot
 * so P&L doesn't drift outside trading hours (matches real broker behavior).
 */
export function useLiveTicks(keys: string[], intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const status = getMarketStatus(new Date(now));
  // Freeze the time axis when the market is closed.
  const t = (status.open ? now : status.lastCloseMs) / 1000;

  const ticks: Record<string, number> = {};
  for (const key of keys) {
    const seed = hash(key);
    const phase = (seed % 1000) / 1000;
    const freq1 = 0.35 + ((seed >> 3) % 100) / 400;
    const freq2 = 0.13 + ((seed >> 7) % 100) / 500;
    const isOption = key.includes("|CE") || key.includes("|PE");
    const amp = isOption ? 0.04 : 0.012;
    const osc =
      Math.sin(t * freq1 + phase * Math.PI * 2) * 0.7 +
      Math.sin(t * freq2 + phase * Math.PI * 4) * 0.3;
    ticks[key] = 1 + osc * amp;
  }
  return ticks;
}
