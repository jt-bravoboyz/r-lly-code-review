CREATE OR REPLACE FUNCTION public.accept_squad_invite(p_squad_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
  v_phone text;
  v_invite_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  -- Owner shortcut: owner is implicitly a member; nothing to do
  IF EXISTS (SELECT 1 FROM public.squads WHERE id = p_squad_id AND owner_id = v_profile_id) THEN
    RETURN jsonb_build_object('success', true, 'squad_id', p_squad_id, 'note', 'already_owner');
  END IF;

  -- Already a member
  IF EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = p_squad_id AND profile_id = v_profile_id) THEN
    -- Mark any matching pending invites as accepted to keep state clean
    UPDATE public.squad_invites
    SET status = 'accepted'
    WHERE squad_id = p_squad_id
      AND status = 'pending'
      AND contact_value = 'profile:' || v_profile_id::text;
    RETURN jsonb_build_object('success', true, 'squad_id', p_squad_id, 'note', 'already_member');
  END IF;

  -- Look up caller's email / phone to match sms/email invites too
  SELECT u.email, u.phone INTO v_email, v_phone
  FROM auth.users u WHERE u.id = auth.uid();

  -- Verify a valid pending invite exists for this caller
  SELECT EXISTS (
    SELECT 1 FROM public.squad_invites si
    WHERE si.squad_id = p_squad_id
      AND si.status = 'pending'
      AND si.expires_at > now()
      AND (
        si.contact_value = 'profile:' || v_profile_id::text
        OR (si.invite_type = 'email' AND v_email IS NOT NULL AND lower(si.contact_value) = lower(v_email))
        OR (
          si.invite_type = 'sms' AND v_phone IS NOT NULL
          AND right(regexp_replace(si.contact_value, '[^0-9]', '', 'g'), 10)
              = right(regexp_replace(v_phone, '[^0-9]', '', 'g'), 10)
        )
      )
  ) INTO v_invite_exists;

  IF NOT v_invite_exists THEN
    RETURN jsonb_build_object('error', 'not_invited');
  END IF;

  INSERT INTO public.squad_members (squad_id, profile_id, role)
  VALUES (p_squad_id, v_profile_id, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE public.squad_invites
  SET status = 'accepted'
  WHERE squad_id = p_squad_id
    AND status = 'pending'
    AND (
      contact_value = 'profile:' || v_profile_id::text
      OR (invite_type = 'email' AND v_email IS NOT NULL AND lower(contact_value) = lower(v_email))
      OR (
        invite_type = 'sms' AND v_phone IS NOT NULL
        AND right(regexp_replace(contact_value, '[^0-9]', '', 'g'), 10)
            = right(regexp_replace(v_phone, '[^0-9]', '', 'g'), 10)
      )
    );

  RETURN jsonb_build_object('success', true, 'squad_id', p_squad_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_squad_invite(p_squad_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
  v_phone text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  SELECT u.email, u.phone INTO v_email, v_phone FROM auth.users u WHERE u.id = auth.uid();

  UPDATE public.squad_invites
  SET status = 'declined'
  WHERE squad_id = p_squad_id
    AND status = 'pending'
    AND (
      contact_value = 'profile:' || v_profile_id::text
      OR (invite_type = 'email' AND v_email IS NOT NULL AND lower(contact_value) = lower(v_email))
      OR (
        invite_type = 'sms' AND v_phone IS NOT NULL
        AND right(regexp_replace(contact_value, '[^0-9]', '', 'g'), 10)
            = right(regexp_replace(v_phone, '[^0-9]', '', 'g'), 10)
      )
    );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_squad_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_squad_invite(uuid) TO authenticated;