import { useEffect, useState } from "react";
import { getMarketStatus, type MarketStatus } from "@/lib/market-hours";

export function useMarketStatus(intervalMs = 30_000): MarketStatus {
  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(getMarketStatus()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return status;
}
