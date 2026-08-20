import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { placeOrder, type OrderInput } from "@/lib/trading.functions";
import { formatINR } from "@/lib/format";

export type TradeTarget = {
  symbol: string;
  instrument_type?: "EQ" | "CE" | "PE";
  strike?: number | null;
  expiry?: string | null;
  exchange?: string;
  price: number;
  lotSize?: number;
};

export function TradeTicket({
  target,
  side: initialSide,
  onClose,
  limitPrice,
  initialOrderType,
  onOrderTypeChange,
}: {
  target: TradeTarget;
  side: "BUY" | "SELL";
  onClose: () => void;
  /** When set, the ticket opens as a LIMIT order prefilled with this price. */
  limitPrice?: number;
  /** Overrides the order type the ticket opens with. */
  initialOrderType?: "MARKET" | "LIMIT";
  /** Called whenever the user switches MARKET/LIMIT, so callers can persist it. */
  onOrderTypeChange?: (t: "MARKET" | "LIMIT") => void;
}) {
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const lotSize = target.lotSize ?? 1;
  const [qty, setQty] = useState<number>(lotSize);
  const [price, setPrice] = useState<number>(limitPrice ?? target.price);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">(
    initialOrderType ?? (limitPrice != null ? "LIMIT" : "MARKET"),
  );
  const [busy, setBusy] = useState(false);
  const place = useServerFn(placeOrder);
  const qc = useQueryClient();


  const notional = qty * price;
  const isBuy = side === "BUY";

  async function submit() {
    setBusy(true);
    try {
      const payload: OrderInput = {
        symbol: target.symbol,
        instrument_type: target.instrument_type ?? "EQ",
        strike: target.strike ?? null,
        expiry: target.expiry ?? null,
        exchange: target.exchange ?? "NSE",
        side,
        qty,
        price: orderType === "MARKET" ? target.price : price,
      };
      await place({ data: payload });
      toast.success(`${side} ${qty} ${target.symbol} filled @ ₹${payload.price.toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  const contractLabel =
    target.instrument_type && target.instrument_type !== "EQ"
      ? `${target.strike} ${target.instrument_type}`
      : "EQ";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface-1 p-4 sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {target.exchange ?? "NSE"} · {contractLabel}
              {target.expiry ? ` · ${target.expiry}` : ""}
            </div>
            <div className="mt-0.5 text-lg font-bold">{target.symbol}</div>
            <div className="text-sm text-muted-foreground tabular-nums">
              LTP ₹{target.price.toFixed(2)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full bg-background text-muted-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-xl bg-background p-1">
          <button
            onClick={() => setSide("BUY")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              isBuy ? "bg-bull text-white" : "text-muted-foreground"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              !isBuy ? "bg-bear text-white" : "text-muted-foreground"
            }`}
          >
            SELL
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">Qty</span>
            <input
              type="number"
              min={1}
              step={lotSize}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-muted-foreground">Price</span>
            <input
              type="number"
              min={0}
              step={0.05}
              disabled={orderType === "MARKET"}
              value={orderType === "MARKET" ? target.price : price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-primary disabled:opacity-60"
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          {(["MARKET", "LIMIT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setOrderType(t);
                onOrderTypeChange?.(t);
              }}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                orderType === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Approx. amount</span>
          <span className="font-semibold tabular-nums">{formatINR(notional)}</span>
        </div>

        <button
          disabled={busy || qty < 1}
          onClick={submit}
          className={`mt-4 w-full rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60 ${
            isBuy ? "bg-bull hover:brightness-110" : "bg-bear hover:brightness-110"
          }`}
        >
          {busy ? "Placing…" : `${side} ${target.symbol}`}
        </button>
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          Paper trade · No real money involved
        </div>
      </div>
    </div>
  );
}
