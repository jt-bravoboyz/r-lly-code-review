-- Phase 2: Payment handle scoping

-- RPC: return another user's payment handles only when an active settlement
-- relationship exists between caller and target (or it's the caller themselves).
CREATE OR REPLACE FUNCTION public.get_payment_handles_for_settlement(_target_profile_id uuid)
RETURNS TABLE (
  display_name text,
  venmo_handle text,
  cashapp_handle text,
  paypal_handle text,
  apple_cash_handle text,
  preferred_settlement text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_profile_id uuid;
  v_allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL OR _target_profile_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_caller_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_caller_profile_id IS NULL THEN
    RETURN;
  END IF;

  -- Self read
  IF v_caller_profile_id = _target_profile_id THEN
    v_allowed := true;
  END IF;

  -- Caller is host of a request where target is a (non-canceled) payer
  IF NOT v_allowed AND EXISTS (
    SELECT 1
    FROM public.split_check_requests r
    JOIN public.split_check_targets t ON t.request_id = r.id
    WHERE r.host_id = v_caller_profile_id
      AND t.profile_id = _target_profile_id
      AND COALESCE(t.status, '') <> 'canceled'
  ) THEN
    v_allowed := true;
  END IF;

  -- Target is host of a request where caller is a (non-canceled) payer
  IF NOT v_allowed AND EXISTS (
    SELECT 1
    FROM public.split_check_requests r
    JOIN public.split_check_targets t ON t.request_id = r.id
    WHERE r.host_id = _target_profile_id
      AND t.profile_id = v_caller_profile_id
      AND COALESCE(t.status, '') <> 'canceled'
  ) THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.display_name,
         p.venmo_handle,
         p.cashapp_handle,
         p.paypal_handle,
         p.apple_cash_handle,
         p.preferred_settlement
  FROM public.profiles p
  WHERE p.id = _target_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_handles_for_settlement(uuid) TO authenticated;

-- Remove blanket profile read; keep self + admin reads.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;