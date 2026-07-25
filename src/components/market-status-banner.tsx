import { Link } from "@tanstack/react-router";
import { Activity, Moon } from "lucide-react";
import { useMarketStatus } from "@/hooks/use-market-status";

export function MarketStatusBanner() {
  const status = useMarketStatus();

  if (status.open) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-bull/30 bg-bull/10 px-3 py-2 text-xs">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-bull opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-bull" />
        </span>
        <Activity className="size-3.5 text-bull" />
        <span className="font-medium text-bull">Market Open</span>
        <span className="text-muted-foreground">• Live data streaming</span>
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <Moon className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{status.label}</span>
      </div>
      <Link
        to="/learn"
        className="rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary"
      >
        Backtest / Practice
      </Link>
    </div>
  );
}
