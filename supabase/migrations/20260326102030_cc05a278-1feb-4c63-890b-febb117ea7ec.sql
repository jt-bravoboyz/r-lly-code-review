-- Finding 1: Restrict squad_invites SELECT to inviter + squad members/owners
DROP POLICY IF EXISTS "Authenticated users can view pending invites" ON public.squad_invites;

CREATE POLICY "Squad members can view invites"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR public.is_squad_member_or_owner(squad_id)
);

-- Create safe RPC for JoinSquad page invite lookup
CREATE OR REPLACE FUNCTION public.get_squad_invite_preview(p_invite_code text)
RETURNS TABLE(
  id uuid, squad_id uuid, invite_code text, status text, expires_at timestamptz,
  squad_name text, owner_display_name text, owner_avatar_url text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT si.id, si.squad_id, si.invite_code, si.status, si.expires_at,
         s.name, sp.display_name, sp.avatar_url
  FROM squad_invites si
  JOIN squads s ON s.id = si.squad_id
  LEFT JOIN safe_profiles sp ON sp.id = s.owner_id
  WHERE UPPER(si.invite_code) = UPPER(p_invite_code)
    AND si.status = 'pending'
    AND si.expires_at > now();
END;
$$;

-- Finding 2: Create secure join RPC and drop vulnerable INSERT policy
CREATE OR REPLACE FUNCTION public.join_squad_by_invite_code(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_squad_id uuid;
  v_invite_id uuid;
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

  RETURN jsonb_build_object('success', true, 'squad_id', v_squad_id);
END;
$$;

DROP POLICY IF EXISTS "Users can join via valid invite" ON public.squad_members;

-- Finding 3: Restrict barhop_stops to authenticated event members
DROP POLICY IF EXISTS "Anyone can view barhop stops" ON public.barhop_stops;

CREATE POLICY "Event members can view barhop stops"
ON public.barhop_stops
FOR SELECT
TO authenticated
USING (public.is_event_member(event_id));