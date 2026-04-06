
-- A. Update join_squad_by_invite_code with referral attribution
CREATE OR REPLACE FUNCTION public.join_squad_by_invite_code(p_invite_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_squad_id uuid;
  v_invite_id uuid;
  v_profile_created timestamptz;
  v_referred_by uuid;
  v_joiner_name text;
  v_owner_id uuid;
  v_owner_user_id uuid;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  SELECT id, squad_id INTO v_invite_id, v_squad_id
  FROM squad_invites
  WHERE UPPER(invite_code) = UPPER(p_invite_code)
    AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF v_squad_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite');
  END IF;

  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = v_squad_id AND profile_id = v_profile_id) THEN
    RETURN jsonb_build_object('error', 'Already a member');
  END IF;

  INSERT INTO squad_members (squad_id, profile_id)
  VALUES (v_squad_id, v_profile_id);

  UPDATE squad_invites SET status = 'accepted' WHERE id = v_invite_id;

  -- Referral attribution for new users
  SELECT created_at, referred_by, display_name
  INTO v_profile_created, v_referred_by, v_joiner_name
  FROM profiles WHERE id = v_profile_id;

  IF v_referred_by IS NULL AND v_profile_created > (now() - interval '24 hours') THEN
    SELECT owner_id INTO v_owner_id FROM squads WHERE id = v_squad_id;

    IF v_owner_id IS NOT NULL AND v_owner_id != v_profile_id THEN
      UPDATE profiles SET referred_by = v_owner_id WHERE id = v_profile_id;

      SELECT user_id INTO v_owner_user_id FROM profiles WHERE id = v_owner_id;

      IF v_owner_user_id IS NOT NULL THEN
        PERFORM public.rly_award_points(v_owner_user_id, 'referral_signup', v_profile_id);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'squad_id', v_squad_id);
END;
$function$;

-- B. Update rly_award_points with referral notification
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
          COALESCE(v_joiner_name, 'A new user') || ' just joined. Check your achievements to see your new points.',
          jsonb_build_object('source_profile_id', p_source_id),
          false
        );
      END IF;
    END IF;
  END IF;
  
  RETURN v_row;
END;
$function$;
