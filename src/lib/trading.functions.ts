import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderInput = {
  symbol: string;
  instrument_type?: "EQ" | "CE" | "PE";
  strike?: number | null;
  expiry?: string | null;
  exchange?: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
};

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: OrderInput) => {
    if (!data.symbol) throw new Error("Symbol required");
    if (!(data.qty > 0)) throw new Error("Qty must be positive");
    if (!(data.price >= 0)) throw new Error("Invalid price");
    if (data.side !== "BUY" && data.side !== "SELL") throw new Error("Invalid side");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const notional = data.qty * data.price;

    // Load wallet
    const { data: wallet, error: wErr } = await supabase
      .from("virtual_wallets")
      .select("balance, realized_pnl")
      .eq("user_id", userId)
      .maybeSingle();
    if (wErr) throw new Error(wErr.message);
    const balance = Number(wallet?.balance ?? 0);

    if (data.side === "BUY" && notional > balance) {
      throw new Error("Insufficient virtual balance");
    }

    // Insert order
    const { data: order, error: oErr } = await supabase
      .from("paper_orders")
      .insert({
        user_id: userId,
        symbol: data.symbol,
        instrument_type: data.instrument_type ?? "EQ",
        strike: data.strike ?? null,
        expiry: data.expiry ?? null,
        exchange: data.exchange ?? "NSE",
        side: data.side,
        qty: data.qty,
        price: data.price,
        status: "COMPLETED",
      })
      .select()
      .single();
    if (oErr) throw new Error(oErr.message);

    // Update wallet balance (paper): BUY deducts, SELL credits
    const delta = data.side === "BUY" ? -notional : notional;
    const { error: uErr } = await supabase
      .from("virtual_wallets")
      .update({ balance: balance + delta })
      .eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);

    return { ok: true as const, order };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("paper_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export type Position = {
  symbol: string;
  instrument_type: string;
  strike: number | null;
  expiry: string | null;
  exchange: string;
  qty: number; // net qty (BUY - SELL)
  avg_price: number;
  invested: number;
  last_price: number;
};

export const listPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("paper_orders")
      .select("symbol, instrument_type, strike, expiry, exchange, side, qty, price, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const map = new Map<string, Position>();
    for (const o of data ?? []) {
      const key = `${o.symbol}|${o.instrument_type}|${o.strike ?? ""}|${o.expiry ?? ""}`;
      const prev = map.get(key) ?? {
        symbol: o.symbol,
        instrument_type: o.instrument_type,
        strike: o.strike,
        expiry: o.expiry,
        exchange: o.exchange,
        qty: 0,
        avg_price: 0,
        invested: 0,
        last_price: Number(o.price),
      };
      const price = Number(o.price);
      const q = Number(o.qty);
      if (o.side === "BUY") {
        const newQty = prev.qty + q;
        const newInvested = prev.invested + q * price;
        prev.avg_price = newQty > 0 ? newInvested / newQty : 0;
        prev.qty = newQty;
        prev.invested = newInvested;
      } else {
        prev.qty = prev.qty - q;
        prev.invested = prev.avg_price * Math.max(prev.qty, 0);
      }
      prev.last_price = price;
      map.set(key, prev);
    }
    return Array.from(map.values());
  });
