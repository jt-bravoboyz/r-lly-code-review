
ALTER TABLE public.rly_activity_badge_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read badge tiers"
  ON public.rly_activity_badge_tiers
  FOR SELECT
  TO authenticated
  USING (true);
