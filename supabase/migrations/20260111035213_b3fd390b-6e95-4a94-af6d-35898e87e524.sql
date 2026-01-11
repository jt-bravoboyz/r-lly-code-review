-- Fix squad_members infinite recursion by rewriting SELECT policies
-- The issue is the "Can view squad members in my squads" policy references squad_members in a UNION

-- Drop conflicting policies
DROP POLICY IF EXISTS "Can view squad members in my squads" ON public.squad_members;
DROP POLICY IF EXISTS "Squad owners can view members" ON public.squad_members;

-- Create a new clean SELECT policy that doesn't self-reference in a problematic way
-- Use a different approach: check if user owns the squad OR is the profile in question
CREATE POLICY "Squad members and owners can view members"
ON public.squad_members
FOR SELECT
USING (
  -- User owns the squad
  squad_id IN (
    SELECT s.id FROM squads s 
    WHERE s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
  OR
  -- User is the member being viewed (can always see themselves)
  profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  OR
  -- User is in the same squad (use a direct join approach to avoid recursion)
  EXISTS (
    SELECT 1 FROM squads s
    WHERE s.id = squad_members.squad_id
    AND (
      s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
      OR s.id IN (
        SELECT sm2.squad_id FROM squad_members sm2 
        WHERE sm2.profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
        AND sm2.squad_id = squad_members.squad_id
      )
    )
  )
);