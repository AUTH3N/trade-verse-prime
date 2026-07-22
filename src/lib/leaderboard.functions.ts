import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LeaderRow = {
  rank: number;
  handle: string;
  avatar_seed: string;
  realized_pnl: number;
  win_rate: number;
  total_trades: number;
  isYou: boolean;
};

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: seed }, { data: wallet }, { data: profile }] = await Promise.all([
      context.supabase
        .from("leaderboard_seed")
        .select("handle, avatar_seed, realized_pnl, win_rate, total_trades"),
      context.supabase
        .from("virtual_wallets")
        .select("realized_pnl")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);

    const you = {
      handle: profile?.display_name ? `@${profile.display_name.toLowerCase().replace(/\s+/g, "_")}` : "@you",
      avatar_seed: context.userId.slice(0, 6),
      realized_pnl: Number(wallet?.realized_pnl ?? 0),
      // Placeholder stats for MVP — hook to trades table when available
      win_rate: 0,
      total_trades: 0,
      isYou: true as const,
    };

    const all = [
      ...(seed ?? []).map((s) => ({ ...s, realized_pnl: Number(s.realized_pnl), win_rate: Number(s.win_rate), isYou: false })),
      you,
    ]
      .sort((a, b) => b.realized_pnl - a.realized_pnl)
      .map((r, i): LeaderRow => ({ ...r, rank: i + 1 }));

    return all;
  });
