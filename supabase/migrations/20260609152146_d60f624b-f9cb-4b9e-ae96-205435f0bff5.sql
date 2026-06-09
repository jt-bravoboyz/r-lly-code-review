
-- 1. Profile handle columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS venmo_handle text,
  ADD COLUMN IF NOT EXISTS cashapp_handle text,
  ADD COLUMN IF NOT EXISTS paypal_handle text,
  ADD COLUMN IF NOT EXISTS preferred_settlement text
    CHECK (preferred_settlement IS NULL OR preferred_settlement IN ('venmo','cashapp','paypal','card'));

-- 2. tab_settlements table
CREATE TABLE IF NOT EXISTS public.tab_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_target_id uuid REFERENCES public.split_check_targets(id) ON DELETE CASCADE,
  split_request_id uuid REFERENCES public.split_check_requests(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  method text NOT NULL CHECK (method IN ('venmo','cashapp','paypal','card','other')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','link_opened','sent','confirmed','disputed')),
  link_opened_at timestamptz,
  app_returned_at timestamptz,
  marked_sent_at timestamptz,
  auto_confirm_at timestamptz,
  confirmed_at timestamptz,
  disputed_at timestamptz,
  dispute_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tab_settlements TO authenticated;
GRANT ALL ON public.tab_settlements TO service_role;

-- 4. RLS
ALTER TABLE public.tab_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tab_settlements select payer or payee"
  ON public.tab_settlements
  FOR SELECT
  TO authenticated
  USING (
    payer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR payee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "tab_settlements insert payer"
  ON public.tab_settlements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    payer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "tab_settlements update payer"
  ON public.tab_settlements
  FOR UPDATE
  TO authenticated
  USING (
    payer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status IN ('pending','link_opened')
  )
  WITH CHECK (
    payer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "tab_settlements update payee confirm"
  ON public.tab_settlements
  FOR UPDATE
  TO authenticated
  USING (
    payee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status = 'sent'
  )
  WITH CHECK (
    payee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_tab_settlements_payer ON public.tab_settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_tab_settlements_payee ON public.tab_settlements(payee_id);
CREATE INDEX IF NOT EXISTS idx_tab_settlements_split_target ON public.tab_settlements(split_target_id);

-- 6. Extend split_check_targets status check to allow 'settled'
ALTER TABLE public.split_check_targets DROP CONSTRAINT IF EXISTS split_check_targets_status_check;
ALTER TABLE public.split_check_targets
  ADD CONSTRAINT split_check_targets_status_check
  CHECK (status = ANY (ARRAY['pending'::text,'paid'::text,'declined'::text,'refunded'::text,'settled'::text]));
