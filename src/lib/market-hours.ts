// NSE India session: Mon–Fri, 09:15–15:30 IST (UTC+5:30).
// Deliberately ignores exchange holidays (mock-realistic, good enough for UX gating).

const OPEN_MIN = 9 * 60 + 15;   // 555
const CLOSE_MIN = 15 * 60 + 30; // 930

function istParts(d: Date = new Date()) {
  // Shift UTC → IST by +5:30
  const ist = new Date(d.getTime() + (5 * 60 + 30) * 60_000);
  return {
    day: ist.getUTCDay(), // 0=Sun … 6=Sat
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
    ist,
  };
}

export type MarketStatus = {
  open: boolean;
  reason: "open" | "pre_open" | "closed_session" | "weekend";
  label: string;
  // Epoch ms of the last close boundary (used to freeze mock ticks).
  lastCloseMs: number;
};

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const { day, minutes, ist } = istParts(now);
  const isWeekend = day === 0 || day === 6;

  if (!isWeekend && minutes >= OPEN_MIN && minutes < CLOSE_MIN) {
    return {
      open: true,
      reason: "open",
      label: "Market Open • Live data",
      lastCloseMs: now.getTime(),
    };
  }

  // Compute the most recent 15:30 IST boundary in UTC ms
  const closeIst = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 10, 0)); // 15:30 IST == 10:00 UTC
  let lastClose = closeIst.getTime();
  if (now.getTime() < lastClose || isWeekend || minutes < OPEN_MIN) {
    // step back to previous weekday close
    let step = new Date(lastClose);
    do {
      step = new Date(step.getTime() - 24 * 3600_000);
    } while (step.getUTCDay() === 0 || step.getUTCDay() === 6 || step.getTime() > now.getTime());
    lastClose = step.getTime();
  }

  if (isWeekend) {
    return { open: false, reason: "weekend", label: "Weekend • Practice mode", lastCloseMs: lastClose };
  }
  if (minutes < OPEN_MIN) {
    return { open: false, reason: "pre_open", label: "Pre-open • Practice mode", lastCloseMs: lastClose };
  }
  return { open: false, reason: "closed_session", label: "Market Closed • Practice mode", lastCloseMs: lastClose };
}

export function useLiveMarketStatus(intervalMs = 30_000) {
  // Lightweight polling; imported lazily where needed.
  // Kept out of the base file to avoid a React dep in server code.
  throw new Error("Use useMarketStatus() from '@/hooks/use-market-status' instead.");
}
