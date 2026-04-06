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

  -- Return squad_id even when already a member
  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = v_squad_id AND profile_id = v_profile_id) THEN
    RETURN jsonb_build_object('error', 'Already a member', 'squad_id', v_squad_id);
  END IF;

  -- Also check if user is the owner (owner is not in squad_members)
  SELECT owner_id INTO v_owner_id FROM squads WHERE id = v_squad_id;
  IF v_owner_id = v_profile_id THEN
    RETURN jsonb_build_object('error', 'Already a member', 'squad_id', v_squad_id);
  END IF;

  INSERT INTO squad_members (squad_id, profile_id)
  VALUES (v_squad_id, v_profile_id);

  UPDATE squad_invites SET status = 'accepted' WHERE id = v_invite_id;

  -- Referral attribution for new users
  SELECT created_at, referred_by, display_name
  INTO v_profile_created, v_referred_by, v_joiner_name
  FROM profiles WHERE id = v_profile_id;

  IF v_referred_by IS NULL AND v_profile_created > (now() - interval '24 hours') THEN
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