-- Table to store synced phone contacts for quick re-invites
CREATE TABLE public.phone_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.phone_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own contacts
CREATE POLICY "Users can view their own contacts"
  ON public.phone_contacts FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can insert their own contacts"
  ON public.phone_contacts FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can delete their own contacts"
  ON public.phone_contacts FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Table to track invites sent to phone numbers (for non-app users)
CREATE TABLE public.phone_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  invite_code TEXT NOT NULL DEFAULT public.generate_secure_invite_code(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'clicked', 'joined', 'expired')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.phone_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they sent or are event members
CREATE POLICY "Users can view phone invites for their events"
  ON public.phone_invites FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = invited_by)
    OR public.is_event_member(event_id)
  );

CREATE POLICY "Users can create phone invites"
  ON public.phone_invites FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = invited_by));

CREATE POLICY "Users can update their phone invites"
  ON public.phone_invites FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = invited_by));

-- Table to track invite history (who you've invited before for quick re-invites)
CREATE TABLE public.invite_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_phone TEXT,
  invited_name TEXT,
  last_invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  invite_count INT NOT NULL DEFAULT 1,
  CONSTRAINT invite_target_check CHECK (invited_profile_id IS NOT NULL OR invited_phone IS NOT NULL),
  UNIQUE(inviter_id, invited_profile_id),
  UNIQUE(inviter_id, invited_phone)
);

-- Enable RLS
ALTER TABLE public.invite_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their invite history"
  ON public.invite_history FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = inviter_id));

CREATE POLICY "Users can insert invite history"
  ON public.invite_history FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = inviter_id));

CREATE POLICY "Users can update their invite history"
  ON public.invite_history FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = inviter_id));

-- Indexes for performance
CREATE INDEX idx_phone_contacts_profile ON public.phone_contacts(profile_id);
CREATE INDEX idx_phone_invites_event ON public.phone_invites(event_id);
CREATE INDEX idx_phone_invites_phone ON public.phone_invites(phone_number);
CREATE INDEX idx_phone_invites_code ON public.phone_invites(invite_code);
CREATE INDEX idx_invite_history_inviter ON public.invite_history(inviter_id);

-- Function to match phone invites when a new user signs up
CREATE OR REPLACE FUNCTION public.claim_phone_invites(p_phone TEXT, p_profile_id UUID)
RETURNS SETOF public.phone_invites AS $$
BEGIN
  -- Update phone invites to mark them as claimed
  UPDATE public.phone_invites
  SET 
    status = 'joined',
    claimed_by = p_profile_id,
    claimed_at = now()
  WHERE phone_number = p_phone AND status = 'pending';
  
  -- Create event_invites for each claimed phone invite
  INSERT INTO public.event_invites (event_id, invited_profile_id, invited_by, status)
  SELECT pi.event_id, p_profile_id, pi.invited_by, 'pending'
  FROM public.phone_invites pi
  WHERE pi.claimed_by = p_profile_id AND pi.claimed_at = now()
  ON CONFLICT DO NOTHING;
  
  RETURN QUERY SELECT * FROM public.phone_invites WHERE claimed_by = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;