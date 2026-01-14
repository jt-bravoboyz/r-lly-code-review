-- Create helper function for invite validation (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_valid_squad_invite(p_squad_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_invites
    WHERE squad_id = p_squad_id
    AND status = 'pending'
    AND expires_at > now()
  );
$$;

-- Add RLS Policy: Anyone can view pending, non-expired invites
CREATE POLICY "Anyone can view pending invites"
ON public.squad_invites
FOR SELECT
USING (
  status = 'pending' 
  AND expires_at > now()
);

-- Add RLS Policy: Authenticated users can accept invites
CREATE POLICY "Authenticated users can accept invites"
ON public.squad_invites
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Add RLS Policy: Allow viewing squads via valid invite
CREATE POLICY "Anyone can view squads via valid invite"
ON public.squads
FOR SELECT
USING (
  public.is_valid_squad_invite(id)
);

-- Add RLS Policy: Users can join squads via valid invite (only inserting themselves)
CREATE POLICY "Users can join via valid invite"
ON public.squad_members
FOR INSERT
WITH CHECK (
  -- Must be inserting themselves
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  -- Must have a valid invite for this squad
  AND public.is_valid_squad_invite(squad_id)
);