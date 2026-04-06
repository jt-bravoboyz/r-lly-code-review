
CREATE OR REPLACE FUNCTION public.rly_award_points(p_user_id uuid, p_event_type text, p_source_id uuid DEFAULT NULL::uuid)
 RETURNS rly_points_ledger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_points INTEGER;
  v_row public.rly_points_ledger;
  v_referrer_profile_id UUID;
  v_joiner_name TEXT;
BEGIN
  SELECT points INTO v_points
  FROM public.rly_point_rules
  WHERE event_type = p_event_type AND is_active = TRUE;
  
  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive event_type: %', p_event_type;
  END IF;
  
  IF v_points > 0 AND NOT public.rly_check_daily_cap(p_user_id, p_event_type) THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.rly_points_ledger (user_id, event_type, points, source_id, created_date)
  VALUES (p_user_id, p_event_type, v_points, p_source_id, CURRENT_DATE)
  ON CONFLICT (user_id, event_type, source_id) DO NOTHING
  RETURNING * INTO v_row;
  
  IF v_row.id IS NOT NULL THEN
    PERFORM public.rly_recalc_user_badge(p_user_id);

    -- Auto-notify on referral signup
    IF p_event_type = 'referral_signup' THEN
      SELECT id INTO v_referrer_profile_id FROM public.profiles WHERE user_id = p_user_id;
      SELECT display_name INTO v_joiner_name FROM public.profiles WHERE id = p_source_id;

      IF v_referrer_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (profile_id, type, title, body, data, read)
        VALUES (
          v_referrer_profile_id,
          'referral_success',
          '🎉 Someone joined R@lly because of you!',
          COALESCE(v_joiner_name, 'A new user') || ' just joined via your link. +' || v_points || ' Pts and badge progress!',
          jsonb_build_object('source_profile_id', p_source_id),
          false
        );
      END IF;
    END IF;
  END IF;
  
  RETURN v_row;
END;
$function$;
