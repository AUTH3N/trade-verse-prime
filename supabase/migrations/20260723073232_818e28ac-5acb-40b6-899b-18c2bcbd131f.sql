
CREATE TABLE public.paper_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  instrument_type text NOT NULL DEFAULT 'EQ',
  strike numeric,
  expiry text,
  exchange text NOT NULL DEFAULT 'NSE',
  side text NOT NULL CHECK (side IN ('BUY','SELL')),
  qty integer NOT NULL CHECK (qty > 0),
  price numeric NOT NULL CHECK (price >= 0),
  status text NOT NULL DEFAULT 'COMPLETED',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_orders TO authenticated;
GRANT ALL ON public.paper_orders TO service_role;
ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paper_orders_own_select" ON public.paper_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "paper_orders_own_insert" ON public.paper_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX paper_orders_user_created_idx ON public.paper_orders (user_id, created_at DESC);
