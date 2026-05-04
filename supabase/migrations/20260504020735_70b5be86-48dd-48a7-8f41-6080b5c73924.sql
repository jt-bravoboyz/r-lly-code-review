DROP FUNCTION IF EXISTS public.get_squad_invite_preview(text);

CREATE FUNCTION public.get_squad_invite_preview(p_invite_code text)
RETURNS TABLE(
  id uuid, squad_id uuid, invite_code text, status text,
  expires_at timestamp with time zone, squad_name text,
  owner_display_name text, owner_avatar_url text,
  invite_type text, contact_value text, reason text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_reason text;
BEGIN
  SELECT si.*, s.name AS sq_name, sp.display_name AS owner_name, sp.avatar_url AS owner_avatar
  INTO v_row
  FROM squad_invites si
  JOIN squads s ON s.id = si.squad_id
  LEFT JOIN safe_profiles sp ON sp.id = s.owner_id
  WHERE UPPER(si.invite_code) = UPPER(TRIM(p_invite_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, p_invite_code, NULL::text,
      NULL::timestamptz, NULL::text, NULL::text, NULL::text,
      NULL::text, NULL::text, 'not_found'::text;
    RETURN;
  END IF;

  IF v_row.expires_at <= now() THEN
    v_reason := 'expired';
  ELSIF v_row.status = 'pending' THEN
    v_reason := 'ok';
  ELSIF v_row.status = 'accepted' THEN
    v_reason := 'already_used';
  ELSE
    v_reason := v_row.status;
  END IF;

  RETURN QUERY SELECT v_row.id, v_row.squad_id, v_row.invite_code, v_row.status,
    v_row.expires_at, v_row.sq_name, v_row.owner_name, v_row.owner_avatar,
    v_row.invite_type, v_row.contact_value, v_reason;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_squad_by_invite_code(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_squad_id uuid;
  v_invite_id uuid;
  v_invite_type text;
  v_contact_value text;
  v_status text;
  v_expires timestamptz;
  v_profile_created timestamptz;
  v_referred_by uuid;
  v_owner_id uuid;
  v_owner_user_id uuid;
  v_is_single_use boolean;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;

  SELECT id, squad_id, invite_type, contact_value, status, expires_at
    INTO v_invite_id, v_squad_id, v_invite_type, v_contact_value, v_status, v_expires
  FROM squad_invites
  WHERE UPPER(invite_code) = UPPER(TRIM(p_invite_code))
  LIMIT 1;

  IF v_squad_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid invite');
  END IF;

  IF v_expires <= now() THEN
    RETURN jsonb_build_object('error', 'Expired');
  END IF;

  v_is_single_use := (v_contact_value IS NOT NULL
    AND v_contact_value <> 'native-share'
    AND v_invite_type IN ('in_app','sms','email'));

  IF v_status = 'accepted' AND v_is_single_use THEN
    RETURN jsonb_build_object('error', 'Already used', 'squad_id', v_squad_id);
  END IF;

  IF EXISTS (SELECT 1 FROM squad_members WHERE squad_id = v_squad_id AND profile_id = v_profile_id) THEN
    RETURN jsonb_build_object('error', 'Already a member', 'squad_id', v_squad_id);
  END IF;

  SELECT owner_id INTO v_owner_id FROM squads WHERE id = v_squad_id;
  IF v_owner_id = v_profile_id THEN
    RETURN jsonb_build_object('error', 'Already a member', 'squad_id', v_squad_id);
  END IF;

  INSERT INTO squad_members (squad_id, profile_id) VALUES (v_squad_id, v_profile_id);

  IF v_is_single_use THEN
    UPDATE squad_invites SET status = 'accepted' WHERE id = v_invite_id;
  END IF;

  SELECT created_at, referred_by INTO v_profile_created, v_referred_by
  FROM profiles WHERE id = v_profile_id;

  IF v_referred_by IS NULL AND v_profile_created > (now() - interval '24 hours') THEN
    IF v_owner_id IS NOT NULL AND v_owner_id <> v_profile_id THEN
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

UPDATE squad_invites
SET status = 'pending'
WHERE status = 'accepted'
  AND expires_at > now()
  AND (contact_value IS NULL OR contact_value = 'native-share');
