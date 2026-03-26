-- Tighten raw squad invite access so contact details are never exposed through direct table reads.
DROP POLICY IF EXISTS "Squad members can view invites (safe)" ON public.squad_invites;
DROP POLICY IF EXISTS "Squad owners can manage invites" ON public.squad_invites;
DROP POLICY IF EXISTS "Inviter or admin can view raw squad invites" ON public.squad_invites;
DROP POLICY IF EXISTS "Inviter or squad owner can delete invites" ON public.squad_invites;

CREATE POLICY "Inviter or admin can view raw squad invites"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  invited_by IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Inviter or squad owner can delete invites"
ON public.squad_invites
FOR DELETE
TO authenticated
USING (
  invited_by IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
  )
  OR squad_id IN (
    SELECT s.id
    FROM public.squads s
    WHERE s.owner_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION public.get_squad_invites_safe(p_squad_id uuid)
RETURNS TABLE (
  id uuid,
  squad_id uuid,
  invited_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  invite_type text,
  contact_value text,
  invite_code text,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_is_admin boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT p.id
  INTO v_profile_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  v_is_admin := public.has_role(auth.uid(), 'admin');

  IF NOT v_is_admin AND NOT public.is_squad_member_or_owner(p_squad_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    si.id,
    si.squad_id,
    si.invited_by,
    si.expires_at,
    si.created_at,
    si.invite_type,
    CASE
      WHEN v_is_admin OR si.invited_by = v_profile_id THEN si.contact_value
      ELSE NULL
    END AS contact_value,
    CASE
      WHEN v_is_admin OR si.invited_by = v_profile_id THEN si.invite_code
      ELSE NULL
    END AS invite_code,
    si.status
  FROM public.squad_invites si
  WHERE si.squad_id = p_squad_id
  ORDER BY si.created_at DESC;
END;
$$;