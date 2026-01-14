-- Create helper function to check if user is a squad member or owner (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_squad_member_or_owner(p_squad_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user owns the squad
    SELECT 1 FROM squads
    WHERE id = p_squad_id
    AND owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR EXISTS (
    -- Check if user is a member of the squad
    SELECT 1 FROM squad_members
    WHERE squad_id = p_squad_id
    AND profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
$$;

-- Add RLS Policy: Squad members and owners can create invites
CREATE POLICY "Squad members can create invites"
ON public.squad_invites
FOR INSERT
WITH CHECK (
  -- Must be logged in
  auth.uid() IS NOT NULL
  -- Must be inserting themselves as the inviter
  AND invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  -- Must be a member or owner of the squad
  AND public.is_squad_member_or_owner(squad_id)
);