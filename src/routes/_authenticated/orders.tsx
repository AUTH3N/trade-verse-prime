import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Filter, MoreVertical, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatPct, signedClass } from "@/lib/format";
import { listOrders } from "@/lib/trading.functions";

const soon = (what: string) => toast.info(`${what} — coming soon`);

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — Vyro" }] }),
  component: OrdersPage,
});

const HEADER_INDICES = [
  { name: "NIFTY", value: 24196.55, change: -137.75, pct: -0.56 },
  { name: "SENSEX", value: 77597.27, change: -554.18, pct: -0.71 },
];

const TABS = ["OPEN", "CLOSED", "GTT", "BASKET"] as const;

function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("CLOSED");
  const [q, setQ] = useState("");

  const fn = useServerFn(listOrders);
  const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: () => fn() });
  const list = orders ?? [];

  const closed = list.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");
  const open = list.filter((o) => o.status === "PENDING");

  const filtered = useMemo(
    () => closed.filter((o) => o.symbol.toLowerCase().includes(q.toLowerCase())),
    [closed, q],
  );

  const counts: Record<string, number> = {
    OPEN: open.length,
    CLOSED: closed.length,
    GTT: 0,
    BASKET: 0,
  };

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
          <button onClick={() => soon("Indices detail")} className="text-primary" aria-label="Expand indices">
            <ChevronDown className="size-5" />
          </button>
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
            <button onClick={() => soon("Filter")} className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1" aria-label="Filter">
              <Filter className="size-4" />
            </button>
            <button onClick={() => soon("More options")} className="grid size-10 place-items-center rounded-xl border border-border bg-surface-1" aria-label="More">
              <MoreVertical className="size-4" />
            </button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState label="No closed orders yet — place your first trade" />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
              {filtered.map((o) => {
                const time = new Date(o.created_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isCE = o.instrument_type === "CE";
                return (
                  <div key={o.id} className="px-4 py-3">
                    <div className="flex items-start justify-between text-[11px] text-muted-foreground">
                      <span>{time}</span>
                      <span>{o.instrument_type} · MARKET</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{o.symbol}</span>
                        {o.strike != null && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              isCE ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
                            }`}
                          >
                            {o.strike} {o.instrument_type}
                          </span>
                        )}
                        {o.expiry && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {o.expiry}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        AVG. {Number(o.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-[11px] text-muted-foreground">
                        {o.exchange} ·{" "}
                        <span className={o.side === "BUY" ? "text-bull font-semibold" : "text-bear font-semibold"}>
                          {o.side}
                        </span>{" "}
                        {o.qty} Qty
                      </div>
                      <StatusPill status={o.status as "COMPLETED" | "CANCELLED" | "PENDING"} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "OPEN" && <EmptyState label="No open orders" />}
      {tab === "GTT" && <EmptyState label="No GTT orders" />}
      {tab === "BASKET" && <EmptyState label="No basket orders" />}
    </div>
  );
}

function StatusPill({ status }: { status: "COMPLETED" | "CANCELLED" | "PENDING" }) {
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
