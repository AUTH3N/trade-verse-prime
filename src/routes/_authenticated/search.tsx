import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — Vyro" }] }),
  component: SearchPage,
});

const FILTERS = ["All", "Stocks", "F&O", "Mutual Funds", "Commodities"] as const;

const RECENT = [
  { name: "BLS International Services Ltd", exch: "NSE", sym: "BLS", saved: true },
  { name: "Olatech Solutions Ltd-M", exch: "BSE", sym: "OLATECH", saved: false },
  { name: "CRISIL Ltd", exch: "BSE", sym: "CRISIL", saved: false },
  { name: "Adani Enterprises Ltd", exch: "NSE", sym: "ADANIENT", saved: true },
  { name: "State Bank of India", exch: "NSE", sym: "SBIN", saved: false },
];

const TRENDING = [
  { name: "ICICI Bank Ltd", exch: "NSE", sym: "ICICIBANK" },
  { name: "Reliance Industries Ltd", exch: "NSE", sym: "RELIANCE" },
  { name: "Punjab National Bank", exch: "NSE", sym: "PNB" },
  { name: "HDFC Bank Ltd", exch: "NSE", sym: "HDFCBANK" },
  { name: "Kotak Mahindra Bank Ltd", exch: "NSE", sym: "KOTAKBANK" },
  { name: "JSW Steel Ltd", exch: "NSE", sym: "JSWSTEEL" },
];

function SearchPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [recentList, setRecentList] = useState(RECENT);
  const recent = useMemo(
    () => recentList.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [q, recentList],
  );
  const trending = useMemo(
    () => TRENDING.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  return (
    <div className="-mt-3">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5">
          <Link to="/home" aria-label="Back">
            <ArrowLeft className="size-5 text-primary" />
          </Link>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search "Stocks"'
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Recently viewed</div>
          <button className="text-sm text-primary">Clear all</button>
        </div>
        <div className="mt-2 divide-y divide-border">
          {recent.map((r) => (
            <Row key={r.sym} icon={<Clock className="size-4" />} {...r} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold">Trending searches</div>
        <div className="mt-2 divide-y divide-border">
          {trending.map((r) => (
            <Row key={r.sym} icon={<TrendingUp className="size-4" />} {...r} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  name,
  exch,
  sym,
  saved,
  icon,
}: {
  name: string;
  exch: string;
  sym: string;
  saved?: boolean;
  icon: React.ReactNode;
}) {
  const [isSaved, setSaved] = useState(!!saved);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-1 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {exch} · {sym}
        </div>
      </div>
      <button
        onClick={() => setSaved((s) => !s)}
        className={isSaved ? "text-primary" : "text-muted-foreground"}
        aria-label="Save"
      >
        <Bookmark className={`size-5 ${isSaved ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}
