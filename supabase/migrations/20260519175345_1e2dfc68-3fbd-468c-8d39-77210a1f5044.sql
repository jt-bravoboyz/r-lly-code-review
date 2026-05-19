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
  v_headcount integer := 0;
  v_base_tip integer := 0;
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

  -- Headcount = number of target payers on the request (even-tip denominator)
  SELECT COUNT(*) INTO v_headcount
  FROM public.split_check_targets
  WHERE request_id = p_request_id;

  IF v_req_subtotal IS NULL OR v_req_subtotal <= 0 THEN
    -- No subtotal yet → only tip can apply (split evenly)
    v_tip := CASE WHEN v_headcount > 0 THEN ROUND(v_req_tip::numeric / v_headcount)::integer ELSE 0 END;
    subtotal_cents := v_subtotal; tax_cents := 0; tip_cents := v_tip; total_cents := v_subtotal + v_tip;
    RETURN NEXT; RETURN;
  END IF;

  -- Tax: prorated by claimed subtotal (unchanged)
  v_tax := ROUND((v_subtotal::numeric / v_req_subtotal) * v_req_tax)::integer;

  -- Tip: even split by headcount (NEW — global across event + standalone itemized tabs)
  v_base_tip := CASE WHEN v_headcount > 0 THEN ROUND(v_req_tip::numeric / v_headcount)::integer ELSE 0 END;
  v_tip := v_base_tip;

  -- Determine deterministic absorber: lowest profile_id::text among request targets
  SELECT MIN(profile_id::text)::uuid INTO v_absorber
  FROM public.split_check_targets
  WHERE request_id = p_request_id;

  IF v_absorber IS NULL THEN
    subtotal_cents := v_subtotal; tax_cents := v_tax; tip_cents := v_tip;
    total_cents := v_subtotal + v_tax + v_tip; RETURN NEXT; RETURN;
  END IF;

  v_is_absorber := (v_absorber = p_profile_id);

  IF v_is_absorber THEN
    -- Sum tax allocated to every OTHER claimant (prorated)
    WITH others AS (
      SELECT c.profile_id, SUM(c.quantity_claimed * i.unit_price_cents) AS sub
      FROM public.split_check_item_claims c
      JOIN public.split_check_items i ON i.id = c.item_id
      WHERE i.request_id = p_request_id
        AND c.profile_id <> p_profile_id
      GROUP BY c.profile_id
    )
    SELECT COALESCE(SUM(ROUND((sub::numeric / v_req_subtotal) * v_req_tax)::integer), 0)
    INTO v_sum_other_tax FROM others;

    v_tax := v_req_tax - v_sum_other_tax;

    -- Sum tip allocated to every OTHER target (flat per-head)
    v_sum_other_tip := v_base_tip * GREATEST(v_headcount - 1, 0);
    v_tip := v_req_tip - v_sum_other_tip;
  END IF;

  subtotal_cents := v_subtotal;
  tax_cents := v_tax;
  tip_cents := v_tip;
  total_cents := v_subtotal + v_tax + v_tip;
  RETURN NEXT;
END;
$function$;