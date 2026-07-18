// TradingView-inspired heat / tone helpers for options data.
// Never hardcode hex — always compose HSL from design tokens (bull/bear/warn).

/** Normalize a value into a 0..1 clamp given a max. */
export function norm(value: number, max: number): number {
  if (!max || max <= 0) return 0;
  const n = value / max;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** OI / Volume intensity bar as an inline background (bull tint for CE, bear tint for PE). */
export function oiBarStyle(value: number, max: number, side: "ce" | "pe"): React.CSSProperties {
  const pctW = Math.round(norm(value, max) * 100);
  const token = side === "ce" ? "--color-bull" : "--color-bear";
  const dir = side === "ce" ? "to left" : "to right";
  return {
    backgroundImage: `linear-gradient(${dir}, hsl(var(${token}) / 0.22) 0%, hsl(var(${token}) / 0.22) ${pctW}%, transparent ${pctW}%)`,
  };
}

/** IV heat cell — warm tint scaled by IV percentile (0..1). */
export function ivHeatStyle(iv: number, min = 8, max = 40): React.CSSProperties {
  const t = norm(iv - min, max - min);
  const alpha = (t * 0.32).toFixed(3);
  return {
    backgroundColor: `hsl(var(--color-warn) / ${alpha})`,
    color: t > 0.65 ? "hsl(var(--color-warn))" : undefined,
  };
}

/** Delta / greek tone: bullish for positive, bearish for negative, weighted by |value|. */
export function greekTone(value: number, cap = 1): { color: string } {
  const t = Math.min(1, Math.abs(value) / cap);
  const token = value >= 0 ? "--color-bull" : "--color-bear";
  const alpha = (0.55 + t * 0.45).toFixed(3);
  return { color: `hsl(var(${token}) / ${alpha})` };
}

/** Price tick flash color — TradingView style up/down. */
export function tickTone(change: number): { color: string } {
  if (change === 0) return { color: "hsl(var(--color-muted-foreground))" };
  return { color: change > 0 ? "hsl(var(--color-bull))" : "hsl(var(--color-bear))" };
}
