import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Filter, MoreVertical, Search } from "lucide-react";
import { formatPct, signedClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — Vyro" }] }),
  component: OrdersPage,
});

const HEADER_INDICES = [
  { name: "NIFTY", value: 24196.55, change: -137.75, pct: -0.56 },
  { name: "SENSEX", value: 77597.27, change: -554.18, pct: -0.71 },
];

type Order = {
  time: string;
  sym: string;
  strike: string;
  exp: string;
  exch: string;
  side: "BUY" | "SELL";
  filled: string;
  status: "COMPLETED" | "CANCELLED" | "PENDING";
  price: string;
  type: string;
};

const CLOSED_ORDERS: Order[] = [
  { time: "20 Jul 26 · 09:57 AM", sym: "GOLDM", strike: "140000 PUT", exp: "29 JUL", exch: "MCX", side: "SELL", filled: "1/1 Lots", status: "COMPLETED", price: "AVG. 1550.00", type: "LIMIT: 1550.00 - MIS" },
  { time: "20 Jul 26 · 09:54 AM", sym: "GOLDM", strike: "140000 PUT", exp: "29 JUL", exch: "MCX", side: "BUY", filled: "1/1 Lots", status: "COMPLETED", price: "AVG. 1595.50", type: "LIMIT - MIS" },
  { time: "20 Jul 26 · 09:53 AM", sym: "NIFTY", strike: "24200 PUT", exp: "21 JUL", exch: "NSE", side: "SELL", filled: "0/3 Lots", status: "CANCELLED", price: "TGT. 140.00", type: "LIMIT - BO" },
  { time: "20 Jul 26 · 09:53 AM", sym: "NIFTY", strike: "24200 PUT", exp: "21 JUL", exch: "NSE", side: "SELL", filled: "3/3 Lots", status: "COMPLETED", price: "AVG. 110.00", type: "LIMIT - BO" },
  { time: "20 Jul 26 · 09:50 AM", sym: "NIFTY", strike: "24200 PUT", exp: "21 JUL", exch: "NSE", side: "BUY", filled: "3/3 Lots", status: "COMPLETED", price: "AVG. 118.60", type: "LIMIT - BO" },
  { time: "20 Jul 26 · 09:48 AM", sym: "NIFTY", strike: "24200 PUT", exp: "21 JUL", exch: "NSE", side: "SELL", filled: "0/2 Lots", status: "CANCELLED", price: "TGT. 150.00", type: "LIMIT - BO" },
  { time: "20 Jul 26 · 09:48 AM", sym: "NIFTY", strike: "24200 PUT", exp: "21 JUL", exch: "NSE", side: "SELL", filled: "2/2 Lots", status: "COMPLETED", price: "AVG. 120.10", type: "LIMIT - BO" },
];

const TABS = ["OPEN", "CLOSED", "GTT", "BASKET"] as const;

function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("CLOSED");
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => CLOSED_ORDERS.filter((o) => o.sym.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  const counts: Record<string, number> = { OPEN: 0, CLOSED: CLOSED_ORDERS.length, GTT: 0, BASKET: 0 };

  return (
    <div className="-mt-3 space-y-3">
      <section className="rounded-2xl border border-border bg-surface-1 p-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            {HEADER_INDICES.map((i) => (
              <div key={i.name}>
                <div className="text-[11px] font-semibold">{i.name}</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold tabular-nums">
                    {i.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] tabular-nums ${signedClass(i.change)}`}>
                    {i.change.toFixed(2)} ({formatPct(i.pct)})
                  </span>
                </div>
              </div>
            ))}
          </div>
          <ChevronDown className="size-5 text-primary" />
        </div>
      </section>

      <div className="grid grid-cols-4 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex items-center justify-center gap-1.5 py-3 text-xs font-semibold tracking-wide ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t}
              {counts[t] > 0 && (
                <span
                  className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {counts[t]}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {tab === "CLOSED" && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search in closed orders"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1">
              <Filter className="size-4" />
            </button>
            <button className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1">
              <MoreVertical className="size-4" />
            </button>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
            {filtered.map((o, idx) => (
              <div key={idx} className="px-4 py-3">
                <div className="flex items-start justify-between text-[11px] text-muted-foreground">
                  <span>{o.time}</span>
                  <span>{o.type}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{o.sym}</span>
                    <span className="rounded bg-bear/15 px-1.5 py-0.5 text-[10px] font-semibold text-bear">
                      {o.strike}
                    </span>
                    <span className="text-[10px] font-semibold text-bear">{o.exp}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{o.price}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {o.exch} ·{" "}
                    <span className={o.side === "BUY" ? "text-primary" : "text-bear font-semibold"}>
                      {o.side}
                    </span>{" "}
                    {o.filled}
                  </div>
                  <StatusPill status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "OPEN" && <EmptyState label="No open orders" />}
      {tab === "GTT" && <EmptyState label="No GTT orders" />}
      {tab === "BASKET" && <EmptyState label="No basket orders" />}
    </div>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const cls =
    status === "COMPLETED"
      ? "bg-primary/15 text-primary"
      : status === "CANCELLED"
        ? "bg-bear/15 text-bear"
        : "bg-warn/15 text-warn";
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
