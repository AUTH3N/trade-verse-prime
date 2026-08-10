import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Pause, Play, Radio, RotateCcw } from "lucide-react";
import { getMarketStatus } from "@/lib/market-hours";

const IST_OFFSET = (5 * 60 + 30) * 60_000;
const SESSION_OPEN_MS = (9 * 60 + 15) * 60_000; // from IST midnight
const SESSION_CLOSE_MS = (15 * 60 + 30) * 60_000;
const SPEEDS = [1, 10, 60, 300] as const;

/** epoch ms -> "YYYY-MM-DDTHH:mm" in IST (for <input type="datetime-local">). */
export function toIstInput(ms: number) {
  return new Date(ms + IST_OFFSET).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" read as IST -> epoch ms. */
export function fromIstInput(value: string) {
  return new Date(`${value}:00.000Z`).getTime() - IST_OFFSET;
}

function istMidnight(ms: number) {
  const d = new Date(ms + IST_OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST_OFFSET;
}

export function sessionBounds(ms: number) {
  const base = istMidnight(ms);
  return { open: base + SESSION_OPEN_MS, close: base + SESSION_CLOSE_MS };
}

export type ReplayClock = {
  now: number;
  live: boolean;
  replaying: boolean;
  label: string;
};

/**
 * Market clock that can either follow the live session or replay a chosen
 * historical instant. The market engine is deterministic on the timestamp, so
 * replaying the clock reproduces exactly the premiums and Greeks of that moment.
 */
export function useReplayClock(intervalMs = 1000) {
  const [mode, setMode] = useState<"live" | "replay">("live");
  const [asOf, setAsOf] = useState(() => {
    const s = sessionBounds(Date.now() - 86_400_000);
    return s.open + 60 * 60_000;
  });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(60);
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const asOfRef = useRef(asOf);
  asOfRef.current = asOf;

  useEffect(() => {
    if (mode !== "live") return;
    const id = setInterval(() => setLiveNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [mode, intervalMs]);

  useEffect(() => {
    if (mode !== "replay" || !playing) return;
    const step = 250;
    const id = setInterval(() => {
      const next = asOfRef.current + step * speed;
      const { close } = sessionBounds(asOfRef.current);
      if (next >= Math.min(close, Date.now())) {
        setAsOf(Math.min(close, Date.now()));
        setPlaying(false);
      } else {
        setAsOf(next);
      }
    }, step);
    return () => clearInterval(id);
  }, [mode, playing, speed]);

  const status = getMarketStatus(new Date(liveNow));
  const clock: ReplayClock = useMemo(() => {
    if (mode === "replay") {
      return {
        now: asOf,
        live: false,
        replaying: true,
        label: `Replay • ${new Date(asOf + IST_OFFSET).toISOString().slice(0, 16).replace("T", " ")} IST`,
      };
    }
    return {
      now: status.open ? liveNow : status.lastCloseMs,
      live: status.open,
      replaying: false,
      the: undefined as never,
      label: status.open ? "Live market clock" : status.label,
    } as ReplayClock;
  }, [mode, asOf, liveNow, status.open, status.lastCloseMs, status.label]);

  return {
    clock,
    mode,
    setMode,
    asOf,
    setAsOf,
    playing,
    setPlaying,
    speed,
    setSpeed,
  };
}

export function ReplayControls({
  state,
}: {
  state: ReturnType<typeof useReplayClock>;
}) {
  const { mode, setMode, asOf, setAsOf, playing, setPlaying, speed, setSpeed } = state;
  const bounds = sessionBounds(asOf);
  const maxNow = Math.min(bounds.close, Date.now());
  const pct = Math.max(
    0,
    Math.min(100, ((asOf - bounds.open) / (bounds.close - bounds.open)) * 100),
  );

  return (
    <section className="rounded-2xl border border-border bg-surface-1 p-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-full bg-surface-2 p-0.5">
          <button
            onClick={() => {
              setMode("live");
              setPlaying(false);
            }}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
              mode === "live" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Radio className="size-3" /> Live
          </button>
          <button
            onClick={() => setMode("replay")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
              mode === "replay" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <CalendarClock className="size-3" /> Historical
          </button>
        </div>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          {mode === "replay" ? "Replaying engine clock" : "Following session"}
        </span>
      </div>

      {mode === "replay" && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              As of (IST)
            </span>
            <input
              type="datetime-local"
              value={toIstInput(asOf)}
              max={toIstInput(Date.now())}
              onChange={(e) => {
                const v = fromIstInput(e.target.value);
                if (!Number.isNaN(v)) setAsOf(Math.min(v, Date.now()));
              }}
              className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm tabular-nums"
            />
          </label>

          <div>
            <input
              type="range"
              aria-label="Scrub session time"
              min={bounds.open}
              max={bounds.close}
              step={60_000}
              value={Math.min(Math.max(asOf, bounds.open), bounds.close)}
              onChange={(e) => setAsOf(Math.min(Number(e.target.value), Date.now()))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>09:15</span>
              <span className="tabular-nums">{pct.toFixed(0)}% of session</span>
              <span>15:30</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((v) => !v)}
              disabled={asOf >= maxNow && !playing}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setAsOf(bounds.open);
              }}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              <RotateCcw className="size-3" /> Open
            </button>
            <div className="ml-auto flex gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                    speed === s ? "bg-surface-2 text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
