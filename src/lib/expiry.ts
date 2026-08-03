// NSE-style expiry calendar helpers.
// Index weeklies expire on Thursday; monthlies on the last Thursday of the month.
// If a Thursday is a holiday the exchange shifts to Wednesday — holidays are not
// modelled here, which is fine for a simulator.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
// Contracts settle at 15:30 IST == 10:00 UTC.
const SETTLE_UTC_HOUR = 10;

function toIst(ms: number) {
  return new Date(ms + IST_OFFSET_MS);
}

/** Epoch ms of 15:30 IST on the given IST calendar day. */
function settleMs(year: number, monthIdx: number, day: number) {
  return Date.UTC(year, monthIdx, day, SETTLE_UTC_HOUR, 0, 0, 0);
}

export type ExpiryInfo = {
  /** "27 Nov 2026" — canonical stored form */
  value: string;
  /** "27 Nov" — compact UI form */
  label: string;
  /** epoch ms of settlement (15:30 IST) */
  ms: number;
  monthly: boolean;
};

function lastThursdayOfMonth(year: number, monthIdx: number) {
  const last = new Date(Date.UTC(year, monthIdx + 1, 0));
  const shift = (last.getUTCDay() - 4 + 7) % 7; // 4 = Thursday
  return last.getUTCDate() - shift;
}

function makeInfo(year: number, monthIdx: number, day: number): ExpiryInfo {
  const ms = settleMs(year, monthIdx, day);
  const dd = String(day).padStart(2, "0");
  return {
    value: `${dd} ${MONTHS[monthIdx]} ${year}`,
    label: `${dd} ${MONTHS[monthIdx]}`,
    ms,
    monthly: day === lastThursdayOfMonth(year, monthIdx),
  };
}

/**
 * Upcoming expiries: the next `weeklies` Thursdays followed by the next
 * `monthlies` month-end Thursdays (deduped, chronological).
 */
export function upcomingExpiries(now: number = Date.now(), weeklies = 4, monthlies = 3): ExpiryInfo[] {
  const ist = toIst(now);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();

  const out: ExpiryInfo[] = [];

  // Next Thursdays (including today if not yet settled).
  const todayIdx = new Date(Date.UTC(y, m, d)).getUTCDay();
  let ahead = (4 - todayIdx + 7) % 7;
  for (let i = 0; out.length < weeklies && i < 12; i++) {
    const cand = new Date(Date.UTC(y, m, d + ahead + i * 7));
    const ms = settleMs(cand.getUTCFullYear(), cand.getUTCMonth(), cand.getUTCDate());
    if (ms <= now) continue;
    out.push(makeInfo(cand.getUTCFullYear(), cand.getUTCMonth(), cand.getUTCDate()));
  }

  for (let i = 0; i < monthlies + 1; i++) {
    const mm = m + i;
    const yy = y + Math.floor(mm / 12);
    const mi = ((mm % 12) + 12) % 12;
    const day = lastThursdayOfMonth(yy, mi);
    const ms = settleMs(yy, mi, day);
    if (ms <= now) continue;
    if (out.some((e) => e.ms === ms)) continue;
    out.push(makeInfo(yy, mi, day));
  }

  return out.sort((a, b) => a.ms - b.ms).slice(0, weeklies + monthlies);
}

/** Accepts "27 Nov 2026", "27 Nov" (nearest future year) or an ISO date. */
export function parseExpiry(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return settleMs(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s*(\d{4})?$/.exec(trimmed);
  if (!m) return null;
  const day = Number(m[1]);
  const monthIdx = MONTHS.findIndex((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
  if (monthIdx < 0) return null;

  if (m[3]) return settleMs(Number(m[3]), monthIdx, day);

  // No year given: pick the nearest occurrence that hasn't settled yet.
  const ist = toIst(now);
  const thisYear = settleMs(ist.getUTCFullYear(), monthIdx, day);
  return thisYear > now - 7 * 86_400_000 ? thisYear : settleMs(ist.getUTCFullYear() + 1, monthIdx, day);
}

/** Calendar days remaining (can be fractional, floored at 0). */
export function daysToExpiry(expiry: string | null | undefined, now: number = Date.now()): number | null {
  const ms = parseExpiry(expiry, now);
  if (ms === null) return null;
  return Math.max(0, (ms - now) / 86_400_000);
}

/** Time to expiry in years, with a small floor so pricing stays finite. */
export function yearsToExpiry(expiry: string | null | undefined, now: number = Date.now()): number {
  const d = daysToExpiry(expiry, now);
  if (d === null) return 0;
  return Math.max(d / 365, 1 / (365 * 24 * 12)); // >= 5 minutes
}

export function isExpired(expiry: string | null | undefined, now: number = Date.now()): boolean {
  const ms = parseExpiry(expiry, now);
  return ms !== null && ms <= now;
}

/** "3d 4h", "Today", "Expired" — Kotak-style countdown copy. */
export function expiryCountdown(expiry: string | null | undefined, now: number = Date.now()): string {
  const ms = parseExpiry(expiry, now);
  if (ms === null) return "";
  const diff = ms - now;
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days === 0) return hours <= 0 ? "Expires today" : `${hours}h left`;
  if (days === 1) return `1d ${hours}h left`;
  return `${days}d left`;
}
