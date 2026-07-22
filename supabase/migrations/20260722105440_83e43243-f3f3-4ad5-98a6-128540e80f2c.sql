CREATE TABLE public.leaderboard_seed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  avatar_seed text NOT NULL,
  realized_pnl numeric NOT NULL,
  win_rate numeric NOT NULL,
  total_trades integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leaderboard_seed TO anon, authenticated;
GRANT ALL ON public.leaderboard_seed TO service_role;

ALTER TABLE public.leaderboard_seed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaderboard_seed_public_read" ON public.leaderboard_seed
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.leaderboard_seed (handle, avatar_seed, realized_pnl, win_rate, total_trades) VALUES
  ('@rakesh_bull', 'rakesh', 428650, 74.2, 312),
  ('@nifty_ninja', 'ninja', 356420, 71.8, 284),
  ('@options_guru', 'guru', 298110, 68.5, 421),
  ('@dalal_street', 'dalal', 241380, 66.9, 198),
  ('@theta_hunter', 'theta', 218745, 63.4, 356),
  ('@banknifty_pro', 'bnpro', 187920, 61.2, 245),
  ('@iron_condor', 'condor', 154300, 58.7, 189),
  ('@scalper_x', 'scalperx', 132840, 55.3, 512),
  ('@momentum_ma', 'momo', 98650, 52.1, 167),
  ('@paper_bull_88', 'bull88', 76420, 49.8, 143),
  ('@vega_vibes', 'vega', 54210, 47.6, 121),
  ('@swing_sniper', 'sniper', 32180, 45.2, 98);