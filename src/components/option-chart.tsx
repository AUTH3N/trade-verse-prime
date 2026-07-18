import { useEffect, useRef } from "react";
import { AreaSeries, createChart, HistogramSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";

/**
 * TradingView-styled intraday area chart for an option contract.
 * Uses mock GBM-ish walk; swap the data source when a live feed is wired.
 */
export function OptionChart({
  seed,
  base,
  height = 220,
  bullish,
}: {
  seed: number;
  base: number;
  height?: number;
  bullish: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const cs = getComputedStyle(document.documentElement);
    const hsl = (name: string, a = 1) => `hsl(${cs.getPropertyValue(name).trim()} / ${a})`;
    const bg = hsl("--background");
    const grid = hsl("--border", 0.35);
    const text = hsl("--muted-foreground");
    const tone = bullish ? "--bull" : "--bear";

    const chart = createChart(el, {
      layout: { background: { color: bg }, textColor: text, fontFamily: "Inter, sans-serif" },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      height,
      autoSize: true,
    });
    chartRef.current = chart;

    const area: ISeriesApi<"Area"> = chart.addSeries(AreaSeries, {
      lineColor: hsl(tone),
      topColor: hsl(tone, 0.35),
      bottomColor: hsl(tone, 0.0),
      lineWidth: 2,
      priceLineColor: hsl(tone, 0.6),
    });

    const vol: ISeriesApi<"Histogram"> = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      color: hsl(tone, 0.4),
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    // Deterministic mock walk.
    let s = seed >>> 0;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    const now = Math.floor(Date.now() / 1000);
    const start = now - 60 * 375; // ~1 trading session in minutes
    let px = base;
    const price: Array<{ time: UTCTimestamp; value: number }> = [];
    const volume: Array<{ time: UTCTimestamp; value: number; color: string }> = [];
    let prev = px;
    for (let i = 0; i < 240; i++) {
      const drift = (bullish ? 0.0006 : -0.0006);
      const shock = (rand() - 0.5) * 0.02;
      px = Math.max(0.5, px * (1 + drift + shock));
      const t = (start + i * 60) as UTCTimestamp;
      price.push({ time: t, value: +px.toFixed(2) });
      const up = px >= prev;
      volume.push({
        time: t,
        value: Math.round(500 + rand() * 6000),
        color: up ? hsl("--bull", 0.5) : hsl("--bear", 0.5),
      });
      prev = px;
    }
    area.setData(price);
    vol.setData(volume);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => chart.applyOptions({}));
    ro.observe(el);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [seed, base, height, bullish]);

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
