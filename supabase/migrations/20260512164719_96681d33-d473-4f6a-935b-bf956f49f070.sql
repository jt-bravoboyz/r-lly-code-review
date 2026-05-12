
-- profiles: payer-side saved card
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fluid_pay_token text,
  ADD COLUMN IF NOT EXISTS fluid_pay_card_brand text,
  ADD COLUMN IF NOT EXISTS fluid_pay_card_last4 text,
  ADD COLUMN IF NOT EXISTS fluid_pay_saved_at timestamptz;

-- merchant_accounts
CREATE TABLE IF NOT EXISTS public.merchant_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  fluid_pay_sub_merchant_id text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','pending','active','rejected','disabled')),
  legal_name text, email text, country text,
  requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  payouts_enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma owner read" ON public.merchant_accounts FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ma admin read" ON public.merchant_accounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ma owner insert" ON public.merchant_accounts FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "ma owner update" ON public.merchant_accounts FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE TRIGGER trg_ma_updated BEFORE UPDATE ON public.merchant_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  kind text NOT NULL CHECK (kind IN ('cover','split_share','refund')),
  split_request_id uuid,
  parent_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  fluid_pay_transaction_id text,
  destination_sub_merchant_id text,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  host_net_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded','partially_refunded')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_event ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_split_req ON public.payments(split_request_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments payer read" ON public.payments FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "payments host read" ON public.payments FOR SELECT
  USING (event_id IS NOT NULL AND public.is_event_host_or_cohost(event_id, auth.uid()));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- split_check_requests
CREATE TABLE IF NOT EXISTS public.split_check_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('quick','itemized')),
  total_cents integer NOT NULL DEFAULT 0,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  tip_cents integer NOT NULL DEFAULT 0,
  per_share_cents integer,
  note text,
  receipt_image_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scr_event ON public.split_check_requests(event_id);
ALTER TABLE public.split_check_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scr host all" ON public.split_check_requests FOR ALL
  USING (host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE TRIGGER trg_scr_updated BEFORE UPDATE ON public.split_check_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- split_check_targets
CREATE TABLE IF NOT EXISTS public.split_check_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.split_check_requests(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','declined','refunded')),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  last_nudged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_sct_request ON public.split_check_targets(request_id);
CREATE INDEX IF NOT EXISTS idx_sct_profile ON public.split_check_targets(profile_id);
ALTER TABLE public.split_check_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sct host read" ON public.split_check_targets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.split_check_requests r
    WHERE r.id = split_check_targets.request_id
      AND r.host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));
CREATE POLICY "sct self read" ON public.split_check_targets FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "sct self update" ON public.split_check_targets FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE TRIGGER trg_sct_updated BEFORE UPDATE ON public.split_check_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- now add target-read policy to scr (table now exists)
CREATE POLICY "scr target read" ON public.split_check_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.split_check_targets t
    WHERE t.request_id = split_check_requests.id
      AND t.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- split_check_items
CREATE TABLE IF NOT EXISTS public.split_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.split_check_requests(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL DEFAULT 0,
  total_price_cents integer NOT NULL DEFAULT 0,
  parsed_confidence numeric(4,3),
  edited_by_host boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sci_request ON public.split_check_items(request_id);
ALTER TABLE public.split_check_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sci host all" ON public.split_check_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.split_check_requests r
    WHERE r.id = split_check_items.request_id
      AND r.host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.split_check_requests r
    WHERE r.id = split_check_items.request_id
      AND r.host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));
CREATE POLICY "sci target read" ON public.split_check_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.split_check_targets t
    WHERE t.request_id = split_check_items.request_id
      AND t.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- split_check_item_claims
CREATE TABLE IF NOT EXISTS public.split_check_item_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.split_check_items(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity_claimed integer NOT NULL DEFAULT 1 CHECK (quantity_claimed > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_scic_item ON public.split_check_item_claims(item_id);
CREATE INDEX IF NOT EXISTS idx_scic_profile ON public.split_check_item_claims(profile_id);
ALTER TABLE public.split_check_item_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scic self all" ON public.split_check_item_claims FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "scic host read" ON public.split_check_item_claims FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.split_check_items i
    JOIN public.split_check_requests r ON r.id = i.request_id
    WHERE i.id = split_check_item_claims.item_id
      AND r.host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

-- compute_itemized_share
CREATE OR REPLACE FUNCTION public.compute_itemized_share(p_request_id uuid, p_profile_id uuid)
RETURNS TABLE(subtotal_cents integer, tax_cents integer, tip_cents integer, total_cents integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_subtotal integer := 0; v_req_subtotal integer; v_req_tax integer; v_req_tip integer;
  v_tax integer := 0; v_tip integer := 0;
BEGIN
  SELECT COALESCE(SUM(c.quantity_claimed * i.unit_price_cents), 0) INTO v_subtotal
    FROM split_check_item_claims c
    JOIN split_check_items i ON i.id = c.item_id
   WHERE i.request_id = p_request_id AND c.profile_id = p_profile_id;
  SELECT subtotal_cents, tax_cents, tip_cents INTO v_req_subtotal, v_req_tax, v_req_tip
    FROM split_check_requests WHERE id = p_request_id;
  IF v_req_subtotal IS NOT NULL AND v_req_subtotal > 0 THEN
    v_tax := ROUND((v_subtotal::numeric / v_req_subtotal) * COALESCE(v_req_tax,0))::integer;
    v_tip := ROUND((v_subtotal::numeric / v_req_subtotal) * COALESCE(v_req_tip,0))::integer;
  END IF;
  subtotal_cents := v_subtotal; tax_cents := v_tax; tip_cents := v_tip;
  total_cents := v_subtotal + v_tax + v_tip; RETURN NEXT;
END; $$;

-- host_outstanding_balance
CREATE OR REPLACE FUNCTION public.host_outstanding_balance(p_profile_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(p.host_net_cents), 0)::integer
  FROM payments p JOIN events e ON e.id = p.event_id
  WHERE e.creator_id = p_profile_id AND p.status = 'paid'
    AND p.kind IN ('cover','split_share')
    AND NOT EXISTS (
      SELECT 1 FROM merchant_accounts ma
      WHERE ma.profile_id = p_profile_id AND ma.status='active' AND ma.payouts_enabled=true
    );
$$;

-- receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts auth upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
CREATE POLICY "receipts auth read" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
CREATE POLICY "receipts auth delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_check_targets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_check_item_claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
