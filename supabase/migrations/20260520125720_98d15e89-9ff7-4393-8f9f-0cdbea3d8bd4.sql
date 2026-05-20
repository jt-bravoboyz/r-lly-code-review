DROP FUNCTION IF EXISTS public.request_join_event(uuid, boolean);
DROP FUNCTION IF EXISTS public.request_join_event(uuid);

CREATE OR REPLACE FUNCTION public.request_join_event(
  p_event_id uuid,
  p_invite_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_is_host boolean;
  v_has_invite boolean := false;
  v_code_valid boolean := false;
  v_final_status text;
  v_cover numeric;
  v_paid boolean;
  v_is_founder boolean;
BEGIN
  SELECT id, (founder_number IS NOT NULL)
    INTO v_profile_id, v_is_founder
    FROM profiles WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  SELECT status INTO v_existing_status
  FROM event_attendees
  WHERE event_id = p_event_id AND profile_id = v_profile_id;

  IF v_existing_status = 'attending' THEN
    RETURN jsonb_build_object('error', 'Already attending', 'status', 'attending');
  ELSIF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('error', 'Request already pending', 'status', 'pending');
  END IF;

  v_is_host := EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND creator_id = v_profile_id
  ) OR EXISTS (
    SELECT 1 FROM event_cohosts WHERE event_id = p_event_id AND profile_id = v_profile_id
  );

  -- Cover charge enforcement (hosts/cohosts and Founders are exempt)
  IF NOT v_is_host AND NOT COALESCE(v_is_founder, false) THEN
    SELECT cover_charge INTO v_cover FROM events WHERE id = p_event_id;

    IF COALESCE(v_cover, 0) > 0 THEN
      SELECT EXISTS (
        SELECT 1 FROM payments
        WHERE event_id = p_event_id
          AND user_id = auth.uid()
          AND kind = 'cover'
          AND status = 'succeeded'
      ) INTO v_paid;

      IF NOT v_paid THEN
        RETURN jsonb_build_object(
          'error', 'cover_required',
          'status', 'payment_required',
          'cover_charge', v_cover
        );
      END IF;
    END IF;
  END IF;

  -- Server-side invite code validation (replaces previously-trusted client boolean)
  IF p_invite_code IS NOT NULL AND length(trim(p_invite_code)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM events
      WHERE id = p_event_id
        AND upper(invite_code) = upper(trim(p_invite_code))
        AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now())
    ) INTO v_code_valid;
  END IF;

  v_has_invite := v_code_valid OR EXISTS (
    SELECT 1 FROM event_invites
    WHERE event_id = p_event_id
      AND invited_profile_id = v_profile_id
      AND status IN ('pending', 'accepted')
  );

  v_final_status := CASE WHEN v_is_host OR v_has_invite THEN 'attending' ELSE 'pending' END;

  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, v_final_status)
  ON CONFLICT (event_id, profile_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'status', v_final_status);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_join_event(uuid, text) TO authenticated;