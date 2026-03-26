
DROP POLICY "Anyone can view pending invites" ON public.squad_invites;

CREATE POLICY "Authenticated users can view pending invites"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
);

DROP POLICY "Anyone can view squads via valid invite" ON public.squads;

CREATE POLICY "Authenticated users can view squads via valid invite"
ON public.squads
FOR SELECT
TO authenticated
USING (
  public.is_valid_squad_invite(id)
);
