-- Create secure function to request joining an event
-- This bypasses the RLS chicken-and-egg problem with nested profile lookups
CREATE OR REPLACE FUNCTION public.request_join_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
BEGIN
  -- Get current user's profile ID directly (bypasses RLS)
  SELECT id INTO v_profile_id 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  -- Check if already an attendee
  SELECT status INTO v_existing_status
  FROM event_attendees
  WHERE event_id = p_event_id AND profile_id = v_profile_id;
  
  IF v_existing_status = 'attending' THEN
    RETURN jsonb_build_object('error', 'Already attending', 'status', 'attending');
  ELSIF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('error', 'Request already pending', 'status', 'pending');
  END IF;
  
  -- Insert with pending status
  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, 'pending')
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.request_join_event(uuid) TO authenticated;

-- Add RLS policy for hosts to approve pending requests
CREATE POLICY "Hosts can approve pending attendees"
ON public.event_attendees
FOR UPDATE
TO authenticated
USING (
  status = 'pending' 
  AND is_event_host_or_cohost(event_id, auth.uid())
);

-- Add RLS policy for hosts to decline/remove pending requests
CREATE POLICY "Hosts can decline pending attendees"
ON public.event_attendees
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND is_event_host_or_cohost(event_id, auth.uid())
);