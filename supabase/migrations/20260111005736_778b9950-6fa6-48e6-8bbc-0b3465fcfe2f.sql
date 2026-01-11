-- Create event_invites table for tracking pending RSVPs
CREATE TABLE public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, invited_profile_id)
);

-- Enable RLS
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they sent or received
CREATE POLICY "Users can view their own invites"
ON public.event_invites FOR SELECT
USING (
  invited_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR event_id IN (SELECT id FROM events WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Users can create invites for events they're attending or hosting
CREATE POLICY "Event members can create invites"
ON public.event_invites FOR INSERT
WITH CHECK (
  invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND (
    -- Creator can invite
    event_id IN (SELECT id FROM events WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    -- Or attendee can invite
    OR event_id IN (SELECT ea.event_id FROM event_attendees ea WHERE ea.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  )
);

-- Users can update invites they received (to accept/decline)
CREATE POLICY "Invitees can respond to invites"
ON public.event_invites FOR UPDATE
USING (invited_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
WITH CHECK (invited_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Inviters can delete pending invites
CREATE POLICY "Inviters can delete pending invites"
ON public.event_invites FOR DELETE
USING (
  invited_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND status = 'pending'
);

-- Create index for faster lookups
CREATE INDEX idx_event_invites_invited_profile ON public.event_invites(invited_profile_id);
CREATE INDEX idx_event_invites_event ON public.event_invites(event_id);
CREATE INDEX idx_event_invites_status ON public.event_invites(status);

-- Enable realtime for invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_invites;