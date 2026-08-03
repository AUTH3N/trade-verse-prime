// Black–Scholes pricing + Greeks for index/stock options (European, no dividend).
// Used to keep option LTPs, P&L and Greeks consistent with spot, IV and time to expiry.

export type OptionType = "CE" | "PE";

export type Greeks = {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number; // per 1 vol point (1%)
  intrinsic: number;
  timeValue: number;
};

const RISK_FREE = 0.065; // ~India 10Y / MIBOR-ish

function normPdf(x: number) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Abramowitz–Stegun cumulative normal.
function normCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const v = 1 - normPdf(x) * poly;
  return x >= 0 ? v : 1 - v;
}

export function intrinsicValue(type: OptionType, spot: number, strike: number) {
  return type === "CE" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}

/**
 * @param iv implied volatility as a fraction (0.14 = 14%)
 * @param t  time to expiry in years
 */
export function blackScholes(
  type: OptionType,
  spot: number,
  strike: number,
  iv: number,
  t: number,
  r: number = RISK_FREE,
): Greeks {
  const intrinsic = intrinsicValue(type, spot, strike);

  if (!(t > 0) || !(iv > 0) || !(spot > 0) || !(strike > 0)) {
    return {
      price: intrinsic,
      delta: intrinsic > 0 ? (type === "CE" ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      intrinsic,
      timeValue: 0,
    };
  }

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * t) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const disc = Math.exp(-r * t);

  const call = spot * normCdf(d1) - strike * disc * normCdf(d2);
  const put = strike * disc * normCdf(-d2) - spot * normCdf(-d1);
  const price = Math.max(type === "CE" ? call : put, 0.05);

  const delta = type === "CE" ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = normPdf(d1) / (spot * iv * sqrtT);
  const vega = (spot * normPdf(d1) * sqrtT) / 100;
  const thetaYear =
    type === "CE"
      ? -(spot * normPdf(d1) * iv) / (2 * sqrtT) - r * strike * disc * normCdf(d2)
      : -(spot * normPdf(d1) * iv) / (2 * sqrtT) + r * strike * disc * normCdf(-d2);

  return {
    price: +price.toFixed(2),
    delta: +delta.toFixed(4),
    gamma: +gamma.toFixed(6),
    theta: +(thetaYear / 365).toFixed(2),
    vega: +vega.toFixed(2),
    intrinsic: +intrinsic.toFixed(2),
    timeValue: +Math.max(0, price - intrinsic).toFixed(2),
  };
}

/**
 * Volatility smile: IV rises for OTM wings and for very short-dated contracts,
 * which is what makes near-expiry premiums decay realistically.
 */
export function impliedVol(spot: number, strike: number, years: number, baseIv = 0.14) {
  const moneyness = Math.log(strike / Math.max(spot, 1e-6));
  const smile = 1 + 4.5 * moneyness * moneyness;
  const termBoost = 1 + 0.35 / Math.sqrt(Math.max(years * 365, 0.5));
  return Math.min(1.5, Math.max(0.05, baseIv * smile * termBoost));
}
