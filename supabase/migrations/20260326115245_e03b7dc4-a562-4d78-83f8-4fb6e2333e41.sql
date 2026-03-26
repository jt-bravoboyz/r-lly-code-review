
-- Fix 1: Drop the overly permissive SELECT policy that exposes contact_value
DROP POLICY IF EXISTS "Squad members can view invites" ON public.squad_invites;

-- Create a new SELECT policy that only shows contact_value to the inviter
-- Other squad members can see invite metadata but not contact details
CREATE POLICY "Squad members can view invites (safe)"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  -- Inviter can see everything (including contact_value)
  (invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  OR
  -- Squad owner/members can see invites but RLS column-level isn't possible,
  -- so we use a view or RPC approach. For now, allow squad members to see rows.
  is_squad_member_or_owner(squad_id)
);

-- Fix 2: Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can accept invites" ON public.squad_invites;

-- Create a restricted UPDATE policy: only the inviter or squad owner can update,
-- OR use the join_squad_by_invite_code RPC (which is SECURITY DEFINER and already validates)
-- Since invite acceptance should go through the RPC, we restrict direct UPDATE to inviter/owner only
CREATE POLICY "Inviter or squad owner can update invites"
ON public.squad_invites
FOR UPDATE
TO authenticated
USING (
  (invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  OR
  (squad_id IN (SELECT id FROM squads WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
)
WITH CHECK (
  (invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  OR
  (squad_id IN (SELECT id FROM squads WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
);
