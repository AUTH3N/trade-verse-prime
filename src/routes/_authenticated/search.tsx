import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bookmark, Clock, Radio, TrendingUp } from "lucide-react";
import { getLiveQuote } from "@/lib/quotes.functions";
import { formatPct, signedClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — Vyro" }] }),
  component: SearchPage,
});

const FILTERS = ["All", "Stocks", "F&O", "Commodities"] as const;

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
      {q.trim().length >= 2 && <LiveQuoteCard symbol={q.trim()} />}


      <div className="pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Recently viewed</div>
          <button
            onClick={() => setRecentList([])}
            disabled={recentList.length === 0}
            className="text-sm text-primary disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
        <div className="mt-2 divide-y divide-border">
          {recent.length === 0 && (
            <div className="py-3 text-xs text-muted-foreground">No recent searches</div>
          )}
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
      <Link to="/instrument/$symbol" params={{ symbol: sym }} className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {exch} · {sym}
        </div>
      </Link>
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

function LiveQuoteCard({ symbol }: { symbol: string }) {
  const fn = useServerFn(getLiveQuote);
  const { data, isFetching } = useQuery({
    queryKey: ["live-quote", symbol.toUpperCase()],
    queryFn: () => fn({ data: { symbol } }),
    staleTime: 30_000,
  });

  return (
    <div className="mt-4 rounded-2xl border border-primary/40 bg-surface-1 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Radio className="size-3.5" />
        Live quote · {symbol.toUpperCase()}
        {data?.source === "mock" && (
          <span className="ml-auto rounded bg-warn/20 px-1.5 py-0.5 text-[9px] font-bold text-warn">
            MOCK
          </span>
        )}
      </div>
      {!data ? (
        <div className="mt-2 text-xs text-muted-foreground">
          {isFetching ? "Fetching…" : "Type a ticker (e.g. AAPL, TSLA, RELIANCE.BSE)"}
        </div>
      ) : (
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-bold tabular-nums">
              {data.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-semibold tabular-nums ${signedClass(data.change)}`}>
              {data.change >= 0 ? "+" : ""}
              {data.change.toFixed(2)} ({formatPct(data.changePct)})
            </div>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <div>H {data.high.toFixed(2)}</div>
            <div>L {data.low.toFixed(2)}</div>
            <div>Vol {data.volume.toLocaleString("en-IN")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
