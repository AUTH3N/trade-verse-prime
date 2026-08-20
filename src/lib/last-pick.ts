export type PickSide = "BUY" | "SELL";

export type OrderType = "MARKET" | "LIMIT";

export type LastPick = {
  price: number;
  side: PickSide;
  orderType: OrderType;
  at: number;
};

const key = (symbol: string) => `vyro:pick:${symbol.toUpperCase()}`;

export function loadPick(symbol: string): LastPick | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(symbol));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastPick>;
    if (typeof parsed?.price !== "number" || !Number.isFinite(parsed.price)) return null;
    const side: PickSide = parsed.side === "SELL" ? "SELL" : "BUY";
    const orderType: OrderType = parsed.orderType === "MARKET" ? "MARKET" : "LIMIT";
    return {
      price: parsed.price,
      side,
      orderType,
      at: typeof parsed.at === "number" ? parsed.at : 0,
    };
  } catch {
    return null;
  }
}

export function savePick(
  symbol: string,
  price: number,
  side: PickSide,
  orderType: OrderType = "LIMIT",
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key(symbol),
      JSON.stringify({ price, side, orderType, at: Date.now() } satisfies LastPick),
    );
  } catch {
    /* storage unavailable */
  }
}

export function saveOrderType(symbol: string, orderType: OrderType) {
  const existing = loadPick(symbol);
  if (!existing) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        key(symbol),
        JSON.stringify({ price: 0, side: "BUY", orderType, at: Date.now() } satisfies LastPick),
      );
    } catch {
      /* storage unavailable */
    }
    return;
  }
  savePick(symbol, existing.price, existing.side, orderType);
}

export function clearPick(symbol: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(symbol));
  } catch {
    /* storage unavailable */
  }
}
