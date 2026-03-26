DROP POLICY IF EXISTS "Authenticated users can view squads via valid invite" ON public.squads;

CREATE POLICY "Members and owners can view squads"
ON public.squads
FOR SELECT
TO authenticated
USING (
  public.is_squad_member_or_owner(id)
);