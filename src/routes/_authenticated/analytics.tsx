import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Award, Clock, Target, TrendingUp, Zap } from "lucide-react";
import { formatPct, signedClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Performance — Vyro" },
      { name: "description", content: "Portfolio growth, win rate, best trade, and risk analytics." },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = ["1W", "1M", "3M", "All"] as const;
type Range = (typeof RANGES)[number];

function generateSeries(range: Range): number[] {
  const points = range === "1W" ? 7 : range === "1M" ? 30 : range === "3M" ? 90 : 180;
  const seed = range.charCodeAt(0) + points;
  const rand = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  let v = 500000;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    v += (rand(i) - 0.48) * 3500 + i * 40;
    out.push(v);
  }
  return out;
}

function AnalyticsPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("1M");
  const series = useMemo(() => generateSeries(range), [range]);

  const start = series[0];
  const end = series[series.length - 1];
  const pnl = end - start;
  const pnlPct = (pnl / start) * 100;

  return (
    <div className="-mt-3 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate({ to: "/more" })} aria-label="Back">
          <ArrowLeft className="size-6 text-primary" />
        </button>
        <div className="text-base font-semibold">Performance</div>
        <span className="w-6" />
      </div>

      <section className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="text-xs text-muted-foreground">Portfolio value</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            ₹{Math.round(end).toLocaleString("en-IN")}
          </span>
          <span className={`text-sm font-semibold ${signedClass(pnl)}`}>
            {pnl >= 0 ? "+" : ""}₹{Math.round(pnl).toLocaleString("en-IN")} ({formatPct(pnlPct)})
          </span>
        </div>
        <div className="mt-3">
          <Sparkline data={series} up={pnl >= 0} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={<Target className="size-5" />} label="Win rate" value="62.4%" hint="↑ 3.1% vs last month" tone="bull" />
        <StatCard icon={<TrendingUp className="size-5" />} label="Total trades" value="147" hint="12 this week" tone="primary" />
        <StatCard icon={<Award className="size-5" />} label="Best trade" value="+₹18,420" hint="NIFTY 24200 CE" tone="bull" />
        <StatCard icon={<Zap className="size-5" />} label="Worst trade" value="-₹6,180" hint="BANKNIFTY 57700 PE" tone="bear" />
        <StatCard icon={<Clock className="size-5" />} label="Avg hold time" value="2h 14m" hint="Intraday-heavy" tone="primary" />
        <StatCard icon={<Award className="size-5" />} label="Risk score" value="Moderate" hint="3.2 / 5" tone="warn" />
      </section>

      <section className="rounded-2xl border border-border bg-surface-1 p-4">
        <div className="text-sm font-semibold">Insights</div>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li>• You perform best on <span className="font-semibold text-foreground">NIFTY weekly options</span> — 71% win rate.</li>
          <li>• Losses cluster around <span className="font-semibold text-bear">Friday expiries</span>. Consider sizing down.</li>
          <li>• Avg trade duration dropped by 34 min — you're scalping more this month.</li>
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "bull" | "bear" | "primary" | "warn";
}) {
  const toneClass =
    tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "warn" ? "text-warn" : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-3">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${toneClass}`}>
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const w = 320;
  const h = 90;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const stroke = up ? "#26a69a" : "#ef5350";
  const fill = up ? "rgba(38,166,154,0.18)" : "rgba(239,83,80,0.18)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  );
}
