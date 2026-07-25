import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMarketStatus } from "./market-hours";


export type LiveQuote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  latestTradingDay: string;
  source: "alphavantage" | "mock" | "last_close";
  marketOpen: boolean;
};

/**
 * Fetches a real-time global quote via Alpha Vantage.
 * Falls back to a deterministic mock if ALPHAVANTAGE_API_KEY isn't set
 * or the free-tier rate limit is hit.
 */
export const getLiveQuote = createServerFn({ method: "GET" })
  .inputValidator((raw) => z.object({ symbol: z.string().min(1).max(20) }).parse(raw))
  .handler(async ({ data }): Promise<LiveQuote> => {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    const symbol = data.symbol.toUpperCase();

    if (!apiKey) return mockQuote(symbol, "mock");

    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Alpha Vantage HTTP ${res.status}: ${await res.text()}`);
        return mockQuote(symbol, "mock");
      }
      const json = (await res.json()) as Record<string, unknown>;
      // Rate limit / info message
      if ("Note" in json || "Information" in json) {
        console.warn("Alpha Vantage rate limited:", json["Note"] ?? json["Information"]);
        return mockQuote(symbol, "mock");
      }
      const q = json["Global Quote"] as Record<string, string> | undefined;
      if (!q || !q["05. price"]) return mockQuote(symbol, "mock");

      const price = Number(q["05. price"]);
      const change = Number(q["09. change"]);
      const changePctRaw = q["10. change percent"] ?? "0%";
      const changePct = Number(changePctRaw.replace("%", ""));

      return {
        symbol: q["01. symbol"] ?? symbol,
        price,
        change,
        changePct,
        high: Number(q["03. high"]),
        low: Number(q["04. low"]),
        open: Number(q["02. open"]),
        prevClose: Number(q["08. previous close"]),
        volume: Number(q["06. volume"]),
        latestTradingDay: q["07. latest trading day"] ?? "",
        source: "alphavantage",
      };
    } catch (err) {
      console.error("Alpha Vantage fetch failed:", err);
      return mockQuote(symbol, "mock");
    }
  });

function mockQuote(symbol: string, source: LiveQuote["source"]): LiveQuote {
  // Deterministic pseudo-price so UI feels stable between refreshes.
  const seed = [...symbol].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const base = 100 + rand(1) * 3000;
  const change = (rand(2) - 0.5) * base * 0.03;
  const price = base + change;
  return {
    symbol,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePct: Number(((change / base) * 100).toFixed(2)),
    high: Number((price * (1 + rand(3) * 0.02)).toFixed(2)),
    low: Number((price * (1 - rand(4) * 0.02)).toFixed(2)),
    open: Number((base + (rand(5) - 0.5) * base * 0.01).toFixed(2)),
    prevClose: Number(base.toFixed(2)),
    volume: Math.round(rand(6) * 5_000_000),
    latestTradingDay: new Date().toISOString().slice(0, 10),
    source,
  };
}
