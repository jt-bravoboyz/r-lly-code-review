
-- L: Allow active event attendees to preview split_check_items (so hosts can add targets later)
CREATE POLICY "sci attendee read"
ON public.split_check_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.split_check_requests r
    JOIN public.event_attendees ea ON ea.event_id = r.event_id
    JOIN public.profiles p ON p.id = ea.profile_id
    WHERE r.id = split_check_items.request_id
      AND p.user_id = auth.uid()
  )
);

-- M: Explicit defense-in-depth deny policies on payments for client-side writes.
-- Service role bypasses RLS, so edge functions are unaffected.
CREATE POLICY "payments client deny insert"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "payments client deny update"
ON public.payments
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "payments client deny delete"
ON public.payments
FOR DELETE
TO authenticated
USING (false);

-- E (itemized): Reconciling version of compute_itemized_share — the deterministically
-- chosen "absorber" payer (lowest profile_id text among positive-claim payers) takes
-- the leftover rounding cents from the tax/tip prorate so SUM(targets) == request total.
CREATE OR REPLACE FUNCTION public.compute_itemized_share(p_request_id uuid, p_profile_id uuid)
RETURNS TABLE(subtotal_cents integer, tax_cents integer, tip_cents integer, total_cents integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req_subtotal integer; v_req_tax integer; v_req_tip integer;
  v_subtotal integer := 0;
  v_tax integer := 0; v_tip integer := 0;
  v_sum_other_tax integer := 0; v_sum_other_tip integer := 0;
  v_absorber uuid;
  v_is_absorber boolean := false;
BEGIN
  -- Request totals
  SELECT subtotal_cents, COALESCE(tax_cents,0), COALESCE(tip_cents,0)
    INTO v_req_subtotal, v_req_tax, v_req_tip
  FROM public.split_check_requests WHERE id = p_request_id;

  -- This payer's exact subtotal (integer cents — no rounding)
  SELECT COALESCE(SUM(c.quantity_claimed * i.unit_price_cents), 0) INTO v_subtotal
  FROM public.split_check_item_claims c
  JOIN public.split_check_items i ON i.id = c.item_id
  WHERE i.request_id = p_request_id AND c.profile_id = p_profile_id;

  IF v_req_subtotal IS NULL OR v_req_subtotal <= 0 THEN
    subtotal_cents := v_subtotal; tax_cents := 0; tip_cents := 0; total_cents := v_subtotal;
    RETURN NEXT; RETURN;
  END IF;

  -- Per-payer prorated tax/tip (independent rounding)
  v_tax := ROUND((v_subtotal::numeric / v_req_subtotal) * v_req_tax)::integer;
  v_tip := ROUND((v_subtotal::numeric / v_req_subtotal) * v_req_tip)::integer;

  -- Determine deterministic absorber: lowest profile_id::text among any positive-claim payer
  SELECT MIN(c.profile_id::text)::uuid INTO v_absorber
  FROM public.split_check_item_claims c
  JOIN public.split_check_items i ON i.id = c.item_id
  WHERE i.request_id = p_request_id
    AND c.quantity_claimed > 0
  GROUP BY 1=1;

  -- Fallback: if grouping returned nothing (no claims), no absorption needed
  IF v_absorber IS NULL THEN
    subtotal_cents := v_subtotal; tax_cents := v_tax; tip_cents := v_tip;
    total_cents := v_subtotal + v_tax + v_tip; RETURN NEXT; RETURN;
  END IF;

  v_is_absorber := (v_absorber = p_profile_id);

  IF v_is_absorber THEN
    -- Sum tax/tip allocated to every OTHER claimant, then absorb the remainder
    WITH others AS (
      SELECT c.profile_id, SUM(c.quantity_claimed * i.unit_price_cents) AS sub
      FROM public.split_check_item_claims c
      JOIN public.split_check_items i ON i.id = c.item_id
      WHERE i.request_id = p_request_id
        AND c.profile_id <> p_profile_id
      GROUP BY c.profile_id
    )
    SELECT
      COALESCE(SUM(ROUND((sub::numeric / v_req_subtotal) * v_req_tax)::integer), 0),
      COALESCE(SUM(ROUND((sub::numeric / v_req_subtotal) * v_req_tip)::integer), 0)
    INTO v_sum_other_tax, v_sum_other_tip
    FROM others;

    v_tax := v_req_tax - v_sum_other_tax;
    v_tip := v_req_tip - v_sum_other_tip;
  END IF;

  subtotal_cents := v_subtotal;
  tax_cents := v_tax;
  tip_cents := v_tip;
  total_cents := v_subtotal + v_tax + v_tip;
  RETURN NEXT;
END;
$function$;
