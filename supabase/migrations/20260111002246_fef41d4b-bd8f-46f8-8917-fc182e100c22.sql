-- Create a security definer function to check if user is an event member
-- This avoids the infinite recursion in the event_attendees RLS policy
CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_attendees
    WHERE event_id = p_event_id
    AND profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Event members can view attendees" ON public.event_attendees;

-- Recreate the policy using the security definer function
CREATE POLICY "Event members can view attendees" 
ON public.event_attendees 
FOR SELECT 
USING (public.is_event_member(event_id));