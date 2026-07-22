import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Crown, Medal, TrendingUp, Trophy } from "lucide-react";
import { getLeaderboard } from "@/lib/leaderboard.functions";
import { formatPct, signedClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Vyro" },
      { name: "description", content: "Top paper traders ranked by realized P&L, win rate, and trades." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const fn = useServerFn(getLeaderboard);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["leaderboard"], queryFn: () => fn() }),
  );
  const navigate = useNavigate();

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  const you = data.find((r) => r.isYou);

  return (
    <div className="-mt-3 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate({ to: "/more" })} aria-label="Back">
          <ArrowLeft className="size-6 text-primary" />
        </button>
        <div className="text-base font-semibold">Leaderboard</div>
        <Trophy className="size-5 text-warn" />
      </div>

      <section className="rounded-2xl border border-border bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This Season · Paper Trading
        </div>
        <div className="mt-3 grid grid-cols-3 items-end gap-3">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((r, i) => {
            const heights = ["h-16", "h-24", "h-12"];
            const orders = [1, 0, 2];
            const podium = orders[i];
            const icon =
              podium === 0 ? (
                <Crown className="size-5 text-warn" />
              ) : podium === 1 ? (
                <Medal className="size-5 text-muted-foreground" />
              ) : (
                <Medal className="size-5 text-warn/70" />
              );
            return (
              <div key={r.handle} className="flex flex-col items-center gap-1.5">
                <Avatar seed={r.avatar_seed} size={podium === 0 ? 56 : 44} />
                {icon}
                <div className="text-[11px] font-semibold">{r.handle}</div>
                <div className={`text-xs font-bold tabular-nums ${signedClass(r.realized_pnl)}`}>
                  ₹{Math.round(r.realized_pnl).toLocaleString("en-IN")}
                </div>
                <div className={`${heights[i]} w-full rounded-t-xl bg-primary/25`} />
              </div>
            );
          })}
        </div>
      </section>

      {you && you.rank > 3 && (
        <section className="rounded-2xl border-2 border-primary/60 bg-primary/10 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              {you.rank}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">You — {you.handle}</div>
              <div className="text-[11px] text-muted-foreground">
                Win rate {formatPct(you.win_rate)} · {you.total_trades} trades
              </div>
            </div>
            <div className={`text-sm font-bold tabular-nums ${signedClass(you.realized_pnl)}`}>
              ₹{Math.round(you.realized_pnl).toLocaleString("en-IN")}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-muted-foreground">All rankings</div>
          <div className="flex items-center gap-1 text-xs text-bull">
            <TrendingUp className="size-3.5" /> Live
          </div>
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
          {rest.map((r) => (
            <div
              key={r.handle + r.rank}
              className={`flex items-center gap-3 px-4 py-3 ${r.isYou ? "bg-primary/10" : ""}`}
            >
              <div className="w-7 text-center text-sm font-bold text-muted-foreground tabular-nums">
                {r.rank}
              </div>
              <Avatar seed={r.avatar_seed} size={36} />
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {r.handle} {r.isYou && <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">YOU</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {r.total_trades} trades · {formatPct(r.win_rate)} win
                </div>
              </div>
              <div className={`text-sm font-bold tabular-nums ${signedClass(r.realized_pnl)}`}>
                ₹{Math.round(r.realized_pnl).toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="px-1 pb-4 text-[11px] text-muted-foreground">
        Rankings reset weekly. Virtual P&L only — no real money involved.
      </p>
    </div>
  );
}

function Avatar({ seed, size }: { seed: string; size: number }) {
  const hue = ([...seed].reduce((s, c) => s + c.charCodeAt(0), 0) * 37) % 360;
  const bg = `hsl(${hue} 70% 45%)`;
  const initials = seed.slice(0, 2).toUpperCase();
  return (
    <div
      className="grid place-items-center rounded-full text-white font-bold"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
