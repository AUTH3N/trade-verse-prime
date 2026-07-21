import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { formatPct, signedClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — Vyro" }] }),
  component: WatchlistPage,
});

const LISTS = ["My List 1", "F&O", "Banks", "IT"] as const;

const STOCKS = [
  { sym: "RELIANCE", exch: "NSE", ltp: 2942.55, chg: 24.7, pct: 0.85 },
  { sym: "TCS", exch: "NSE", ltp: 4287.1, chg: -18.2, pct: -0.42 },
  { sym: "HDFCBANK", exch: "NSE", ltp: 783.4, chg: -36.2, pct: -4.42 },
  { sym: "INFY", exch: "NSE", ltp: 1855.9, chg: -5.65, pct: -0.3 },
  { sym: "ICICIBANK", exch: "NSE", ltp: 1455.5, chg: 11.2, pct: 0.78 },
  { sym: "SBIN", exch: "NSE", ltp: 812.35, chg: 4.15, pct: 0.51 },
  { sym: "ADANIENT", exch: "NSE", ltp: 2612.9, chg: -32.1, pct: -1.21 },
];

function WatchlistPage() {
  const [active, setActive] = useState<(typeof LISTS)[number]>("My List 1");
  return (
    <div className="-mt-3 space-y-3">
      <Link
        to="/search"
        className="flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5 text-sm text-muted-foreground"
      >
        <Search className="size-4" />
        <span className="truncate">Search & add scripts</span>
      </Link>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LISTS.map((l) => (
          <button
            key={l}
            onClick={() => setActive(l)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold ${
              active === l
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
        <button
          onClick={() => toast.info("New watchlist — coming soon")}
          className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-primary"
          aria-label="Add watchlist"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
        {STOCKS.map((s) => (
          <button
            key={s.sym}
            onClick={() => toast.info(`${s.sym} detail — coming soon`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{s.sym}</div>
              <div className="text-[11px] text-muted-foreground">{s.exch} · EQ</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums">
                {s.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] tabular-nums ${signedClass(s.chg)}`}>
                {s.chg >= 0 ? "+" : ""}
                {s.chg.toFixed(2)} ({formatPct(s.pct)})
              </div>
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                toast.success(`${s.sym} bookmarked`);
              }}
              className="text-primary"
              aria-label="Bookmark"
            >
              <Bookmark className="size-4 fill-current" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
