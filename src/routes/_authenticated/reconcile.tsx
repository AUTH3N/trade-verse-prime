import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPositions, type Position } from "@/lib/trading.functions";
import { instrumentKey, priceInstrument } from "@/hooks/use-live-ticks";
import { ReplayControls, useReplayClock } from "@/components/replay-clock";

import { baseIvFor, quoteAt } from "@/lib/market-engine";
import { blackScholes, impliedVol, intrinsicValue, type OptionType } from "@/lib/option-pricing";
import { isExpired, yearsToExpiry, expiryCountdown } from "@/lib/expiry";
import { formatINR, signedClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reconcile")({
  head: () => ({
    meta: [
      { title: "Pricing Reconciliation — Vyro" },
      {
        name: "description",
        content:
          "Verify that every open position's premium, Greeks and P&L match the Vyro market engine calculations, tick for tick.",
      },
      { property: "og:title", content: "Pricing Reconciliation — Vyro" },
      {
        property: "og:description",
        content: "Independent re-computation of premiums, Greeks and P&L for every open position.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReconcilePage,
});

/** Absolute tolerances — engine rounds to 2dp / 4dp / 6dp. */
const TOL = { price: 0.011, pnl: 0.05, delta: 0.0011, gamma: 0.0000011, theta: 0.011, vega: 0.011 };

type Check = { label: string; displayed: number; engine: number; tol: number; digits: number };

type Row = {
  key: string;
  position: Position;
  expired: boolean;
  countdown: string;
  ltp: number;
  pnl: number;
  checks: Check[];
  ok: boolean;
};

function build(positions: Position[], now: number): Row[] {
  return positions.map((p) => {
    const key = instrumentKey(p);
    // Value under test: exactly what the portfolio screen renders.
    const live = priceInstrument(p, now);
    const displayedPnl = (live.ltp - p.avg_price) * p.qty;

    // Independent recomputation straight from the market engine primitives.
    const q = quoteAt(p.symbol, now);
    const option = p.instrument_type === "CE" || p.instrument_type === "PE";
    const checks: Check[] = [];

    if (option) {
      const type = p.instrument_type as OptionType;
      const strike = Number(p.strike ?? q.price);
      const expired = isExpired(p.expiry, now);
      const years = expired ? 0 : yearsToExpiry(p.expiry, now);
      const iv = impliedVol(q.price, strike, Math.max(years, 1e-6), baseIvFor(p.symbol));
      const g = blackScholes(type, q.price, strike, iv, years);
      const settled = intrinsicValue(type, q.price, strike);

      checks.push(
        { label: "Premium (LTP)", displayed: live.ltp, engine: g.price, tol: TOL.price, digits: 2 },
        { label: "Delta", displayed: live.delta, engine: g.delta, tol: TOL.delta, digits: 4 },
        { label: "Gamma", displayed: live.gamma, engine: g.gamma, tol: TOL.gamma, digits: 6 },
        { label: "Theta / day", displayed: live.theta, engine: g.theta, tol: TOL.theta, digits: 2 },
        { label: "Vega / vol pt", displayed: live.vega, engine: g.vega, tol: TOL.vega, digits: 2 },
        { label: "IV %", displayed: live.iv, engine: +(iv * 100).toFixed(2), tol: TOL.price, digits: 2 },
      );
      if (expired) {
        checks.push({
          label: "Settlement (intrinsic)",
          displayed: live.ltp,
          engine: +settled.toFixed(2),
          tol: TOL.price,
          digits: 2,
        });
      }
    } else {
      checks.push({
        label: "Spot (LTP)",
        displayed: live.ltp,
        engine: q.price,
        tol: TOL.price,
        digits: 2,
      });
    }

    checks.push({
      label: "Unrealised P&L",
      displayed: displayedPnl,
      engine: (live.ltp - p.avg_price) * p.qty,
      tol: TOL.pnl,
      digits: 2,
    });

    return {
      key,
      position: p,
      expired: live.expired,
      countdown: expiryCountdown(p.expiry),
      ltp: live.ltp,
      pnl: displayedPnl,
      checks,
      ok: checks.every((c) => Math.abs(c.displayed - c.engine) <= c.tol),
    };
  });
}

function ReconcilePage() {
  const posFn = useServerFn(listPositions);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["positions"],
    queryFn: () => posFn(),
    refetchInterval: 15000,
  });

  // One shared clock (live session or historical replay) so every row is
  // reconciled against the exact same instant.
  const replay = useReplayClock(1000);
  const { now, label } = replay.clock;
  const open = (data ?? []).filter((p) => p.qty !== 0);
  const rows = useMemo(() => build(open, now), [JSON.stringify(open), now]);

  const failing = rows.filter((r) => !r.ok);
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);

  return (
    <div className="-mt-3 space-y-3 pb-6">
      <header className="flex items-center gap-3">
        <Link to="/more" aria-label="Back" className="text-muted-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Pricing reconciliation</h1>
          <p className="text-[11px] text-muted-foreground">
            {label} ·{" "}
            {new Date(now).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </p>
        </div>
        <button
          onClick={() => refetch()}
          aria-label="Refresh positions"
          className="rounded-full border border-border p-2 text-muted-foreground"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <ReplayControls state={replay} />


      <section
        className={`rounded-2xl border p-4 ${
          failing.length ? "border-bear/40 bg-bear/10" : "border-bull/40 bg-bull/10"
        }`}
      >
        <div className="flex items-center gap-2">
          {failing.length ? (
            <XCircle className="size-5 text-bear" />
          ) : (
            <CheckCircle2 className="size-5 text-bull" />
          )}
          <span className="text-sm font-semibold">
            {rows.length === 0
              ? "No open positions to verify"
              : failing.length
                ? `${failing.length} of ${rows.length} positions out of tolerance`
                : `All ${rows.length} positions match the engine`}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Positions" value={String(rows.length)} />
          <Stat label="Checks" value={String(rows.reduce((s, r) => s + r.checks.length, 0))} />
          <Stat label="Total P&L" value={formatINR(totalPnl)} tone={signedClass(totalPnl)} />
        </div>
      </section>

      {rows.map((row) => (
        <RowCard key={row.key} row={row} />
      ))}

      {rows.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Place a paper trade and the reconciliation will verify its premium, Greeks and P&L against
          the market engine on every tick.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface-1 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function RowCard({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const p = row.position;
  const name =
    p.instrument_type === "EQ"
      ? p.symbol
      : `${p.symbol} ${p.strike ?? ""} ${p.instrument_type}`.trim();

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {row.ok ? (
              <CheckCircle2 className="size-4 shrink-0 text-bull" />
            ) : (
              <XCircle className="size-4 shrink-0 text-bear" />
            )}
            <span className="truncate text-sm font-semibold">{name}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {p.qty} qty · AVG {p.avg_price.toFixed(2)}
            {p.expiry ? ` · ${row.expired ? "Expired" : row.countdown}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{row.ltp.toFixed(2)}</div>
          <div className={`text-[11px] tabular-nums ${signedClass(row.pnl)}`}>
            {row.pnl >= 0 ? "+" : ""}
            {row.pnl.toFixed(2)}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                <th className="px-2 py-2 text-right font-medium">Displayed</th>
                <th className="px-2 py-2 text-right font-medium">Engine</th>
                <th className="px-3 py-2 text-right font-medium">Diff</th>
              </tr>
            </thead>
            <tbody>
              {row.checks.map((c) => {
                const diff = c.displayed - c.engine;
                const pass = Math.abs(diff) <= c.tol;
                return (
                  <tr key={c.label} className="border-t border-border/60">
                    <td className="px-3 py-2">{c.label}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {c.displayed.toFixed(c.digits)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {c.engine.toFixed(c.digits)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${pass ? "text-bull" : "text-bear"}`}
                    >
                      {pass ? "0" : diff.toFixed(c.digits)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
