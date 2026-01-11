-- Phase B.1: DD Role with Request Flow

-- Add is_dd flag to event_attendees
ALTER TABLE public.event_attendees ADD COLUMN IF NOT EXISTS is_dd BOOLEAN DEFAULT false;

-- Create DD requests table for the request workflow
CREATE TABLE public.event_dd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requested_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Create unique index to prevent duplicate pending requests for same user on same event
CREATE UNIQUE INDEX event_dd_requests_unique_pending 
ON public.event_dd_requests(event_id, requested_profile_id) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.event_dd_requests ENABLE ROW LEVEL SECURITY;

-- Enable realtime for DD requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_dd_requests;

-- Helper function to check if user is host or cohost of an event
CREATE OR REPLACE FUNCTION public.is_event_host_or_cohost(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.profiles p ON e.creator_id = p.id
    WHERE e.id = p_event_id AND p.user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.event_cohosts ec
    JOIN public.profiles p ON ec.profile_id = p.id
    WHERE ec.event_id = p_event_id AND p.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for event_dd_requests

-- Event attendees can view DD requests for their events
CREATE POLICY "Event attendees can view DD requests"
ON public.event_dd_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_attendees ea
    JOIN public.profiles p ON ea.profile_id = p.id
    WHERE ea.event_id = event_dd_requests.event_id 
    AND p.user_id = auth.uid()
  )
);

-- Hosts and cohosts can create DD requests
CREATE POLICY "Hosts and cohosts can create DD requests"
ON public.event_dd_requests FOR INSERT
WITH CHECK (
  public.is_event_host_or_cohost(event_id, auth.uid())
  AND requested_by_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Requested user can respond to their own DD requests
CREATE POLICY "Requested user can respond to DD requests"
ON public.event_dd_requests FOR UPDATE
USING (
  requested_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_event_host_or_cohost(event_id, auth.uid())
);

-- Allow hosts/cohosts to update is_dd on any attendee (for revocation)
-- Also allow attendees to update their own is_dd (for volunteering)
CREATE POLICY "Attendees can update their own DD status or hosts can update any"
ON public.event_attendees FOR UPDATE
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_event_host_or_cohost(event_id, auth.uid())
);