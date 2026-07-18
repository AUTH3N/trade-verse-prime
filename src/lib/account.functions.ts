import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("virtual_wallets")
      .select("starting_capital, balance, margin_used, realized_pnl")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Trigger seeds this on signup; fall back defensively.
    return (
      data ?? {
        starting_capital: 500000,
        balance: 500000,
        margin_used: 0,
        realized_pnl: 0,
      }
    );
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, avatar_url, onboarded, phone")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
