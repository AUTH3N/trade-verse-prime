import { useEffect, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  HistogramSeries,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market-engine";

/**
 * TradingView-style price chart for any instrument.
 * Renders either a smooth area line (default) or candles + volume.
 */
export function PriceChart({
  candles,
  mode = "area",
  height = 260,
  bullish,
  onPricePick,
}: {
  candles: Candle[];
  mode?: "area" | "candles";
  height?: number;
  bullish: boolean;
  /** Fired when the user taps a point on the chart, with the price at that y-coordinate. */
  onPricePick?: (price: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const pickRef = useRef(onPricePick);
  pickRef.current = onPricePick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || candles.length === 0) return;


    const cs = getComputedStyle(document.documentElement);
    const hsl = (name: string, a = 1) => `hsl(${cs.getPropertyValue(name).trim()} / ${a})`;
    const grid = hsl("--border", 0.3);
    const tone = bullish ? "--bull" : "--bear";

    const chart = createChart(el, {
      layout: {
        background: { color: "transparent" },
        textColor: hsl("--muted-foreground"),
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: mode === "area" ? false : true },
      crosshair: { mode: 1 },
      handleScale: { axisPressedMouseMove: false },
      height,
      autoSize: true,
    });
    chartRef.current = chart;

    let main: { coordinateToPrice: (y: number) => number | null };

    if (mode === "area") {
      const area = chart.addSeries(AreaSeries, {
        lineColor: hsl(tone),
        topColor: hsl(tone, 0.4),
        bottomColor: hsl(tone, 0.02),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      area.setData(
        candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })),
      );
      main = area;
    } else {
      const bull = hsl("--bull");
      const bear = hsl("--bear");
      const series = chart.addSeries(CandlestickSeries, {
        upColor: bull,
        downColor: bear,
        borderUpColor: bull,
        borderDownColor: bear,
        wickUpColor: bull,
        wickDownColor: bear,
        priceLineVisible: false,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
      const vol = chart.addSeries(HistogramSeries, {
        priceScaleId: "",
        priceFormat: { type: "volume" },
        lastValueVisible: false,
      });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vol.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? hsl("--bull", 0.4) : hsl("--bear", 0.4),
        })),
      );
      main = series;
    }

    const onClick = (param: { point?: { x: number; y: number } }) => {
      if (!pickRef.current || !param.point) return;
      const price = main.coordinateToPrice(param.point.y);
      if (price != null && Number.isFinite(price)) pickRef.current(+price.toFixed(2));
    };
    chart.subscribeClick(onClick);

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => chart.applyOptions({}));
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.unsubscribeClick(onClick);
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, mode, height, bullish]);


  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
