CREATE OR REPLACE FUNCTION public.request_join_event(p_event_id uuid, p_has_invite_code boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_is_host boolean;
  v_has_invite boolean;
  v_final_status text;
  v_cover numeric;
  v_paid boolean;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  -- Already an attendee? short-circuit (grandfathers existing rows in)
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

  -- Cover charge enforcement (hosts/cohosts are exempt)
  IF NOT v_is_host THEN
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

  v_has_invite := p_has_invite_code OR EXISTS (
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