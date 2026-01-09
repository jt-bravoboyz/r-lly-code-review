-- Create squads table for saving frequent crews
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create squad members junction table
CREATE TABLE public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(squad_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Squads policies
CREATE POLICY "Users can view own squads"
ON public.squads FOR SELECT
USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create squads"
ON public.squads FOR INSERT
WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own squads"
ON public.squads FOR UPDATE
USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own squads"
ON public.squads FOR DELETE
USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Squad members policies
CREATE POLICY "Squad owners can view members"
ON public.squad_members FOR SELECT
USING (squad_id IN (SELECT id FROM squads WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Squad owners can add members"
ON public.squad_members FOR INSERT
WITH CHECK (squad_id IN (SELECT id FROM squads WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Squad owners can remove members"
ON public.squad_members FOR DELETE
USING (squad_id IN (SELECT id FROM squads WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));