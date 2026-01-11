-- Add symbol column to squads table
ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'shield';

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view their own squads" ON public.squads;
DROP POLICY IF EXISTS "Users can view squad members" ON public.squad_members;

-- Allow owners to view their squads
CREATE POLICY "Owners can view their squads"
ON public.squads FOR SELECT
USING (owner_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Allow members to view squads they belong to
CREATE POLICY "Members can view their squads"
ON public.squads FOR SELECT
USING (id IN (
  SELECT squad_id FROM squad_members 
  WHERE profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
));

-- Allow owners to update their squads (including symbol)
CREATE POLICY "Owners can update their squads"
ON public.squads FOR UPDATE
USING (owner_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Allow viewing squad members for squads you own or are a member of
CREATE POLICY "Can view squad members in my squads"
ON public.squad_members FOR SELECT
USING (squad_id IN (
  SELECT id FROM squads WHERE owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  UNION
  SELECT squad_id FROM squad_members WHERE profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
));