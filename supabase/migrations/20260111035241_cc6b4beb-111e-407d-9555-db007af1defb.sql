-- Create a security definer function to check squad membership without recursion
CREATE OR REPLACE FUNCTION public.is_squad_member_or_owner(p_squad_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM squads s 
    WHERE s.id = p_squad_id 
    AND s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM squad_members sm 
    WHERE sm.squad_id = p_squad_id 
    AND sm.profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
$$;

-- Drop the potentially recursive policy
DROP POLICY IF EXISTS "Squad members and owners can view members" ON public.squad_members;

-- Create a clean policy using the security definer function
CREATE POLICY "Squad members and owners can view members"
ON public.squad_members
FOR SELECT
USING (public.is_squad_member_or_owner(squad_id));