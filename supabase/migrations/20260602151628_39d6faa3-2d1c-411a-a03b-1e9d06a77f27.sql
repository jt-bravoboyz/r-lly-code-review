
CREATE OR REPLACE FUNCTION public.get_my_pending_squad_invites()
RETURNS TABLE(
  squad_id uuid,
  squad_name text,
  squad_symbol text,
  squad_group_photo_url text,
  invited_by uuid,
  inviter_name text,
  inviter_avatar text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
  v_phone text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_profile_id IS NULL THEN RETURN; END IF;

  SELECT u.email, u.phone INTO v_email, v_phone
  FROM auth.users u WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT DISTINCT ON (si.squad_id)
    si.squad_id,
    s.name AS squad_name,
    s.symbol AS squad_symbol,
    s.group_photo_url AS squad_group_photo_url,
    si.invited_by,
    inviter.display_name AS inviter_name,
    inviter.avatar_url AS inviter_avatar,
    si.created_at,
    si.expires_at
  FROM public.squad_invites si
  JOIN public.squads s ON s.id = si.squad_id
  LEFT JOIN public.profiles inviter ON inviter.id = si.invited_by
  WHERE si.status = 'pending'
    AND si.expires_at > now()
    AND (
      si.contact_value = 'profile:' || v_profile_id::text
      OR (v_email IS NOT NULL AND si.invite_type = 'email' AND lower(si.contact_value) = lower(v_email))
      OR (v_phone IS NOT NULL AND si.invite_type = 'sms' AND si.contact_value = v_phone)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.squad_members sm
      WHERE sm.squad_id = si.squad_id AND sm.profile_id = v_profile_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.squads s2
      WHERE s2.id = si.squad_id AND s2.owner_id = v_profile_id
    )
  ORDER BY si.squad_id, si.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_pending_squad_invites() TO authenticated;
