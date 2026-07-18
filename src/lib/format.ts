export const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const INR0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const compactINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 2,
});

export const NUM = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function pct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${INR.format(n)}`;
}

export function formatINR(n: number | string): string {
  return INR.format(typeof n === "string" ? Number(n) : n);
}

export function formatPct(n: number, digits = 2): string {
  return pct(n, digits);
}

export function signedClass(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (v > 0) return "text-bull";
  if (v < 0) return "text-bear";
  return "text-muted-foreground";
}

