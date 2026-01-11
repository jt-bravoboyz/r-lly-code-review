-- =============================================================
-- Fix: Event Attendees Location Privacy Protection
-- Only show location data when share_location=true
-- =============================================================

-- Drop existing safe_event_attendees view if it exists
DROP VIEW IF EXISTS public.safe_event_attendees;

-- Create improved safe_event_attendees view that conditionally shows location
-- Location data is only visible when the attendee has share_location=true
CREATE VIEW public.safe_event_attendees 
WITH (security_invoker = true)
AS
SELECT 
  ea.id,
  ea.event_id,
  ea.profile_id,
  ea.status,
  ea.joined_at,
  ea.arrived_at,
  ea.arrived_home,
  ea.going_home_at,
  ea.share_location,
  -- Only show location if share_location is enabled
  CASE WHEN ea.share_location = true THEN ea.current_lat ELSE NULL END as current_lat,
  CASE WHEN ea.share_location = true THEN ea.current_lng ELSE NULL END as current_lng,
  CASE WHEN ea.share_location = true THEN ea.last_location_update ELSE NULL END as last_location_update,
  -- Destination visibility is controlled by destination_visibility field and can_see_destination function
  ea.destination_visibility,
  -- Only show destination if visibility allows it (checked via can_see_destination function in application)
  CASE 
    WHEN ea.destination_visibility = 'all' THEN ea.destination_name
    WHEN ea.destination_visibility = 'selected' AND (
      -- Check if viewer is in destination_shared_with array
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.id = ANY(ea.destination_shared_with)
      )
    ) THEN ea.destination_name
    WHEN EXISTS (
      SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id = ea.profile_id
    ) THEN ea.destination_name -- Own row
    ELSE NULL
  END as destination_name
FROM public.event_attendees ea;

-- Grant access to the view
GRANT SELECT ON public.safe_event_attendees TO authenticated;

-- Create a function that returns event attendees with proper location filtering
-- This can be called from the application instead of querying the table directly
CREATE OR REPLACE FUNCTION public.get_event_attendees_safe(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  profile_id uuid,
  status text,
  joined_at timestamptz,
  arrived_at timestamptz,
  arrived_home boolean,
  going_home_at timestamptz,
  share_location boolean,
  current_lat double precision,
  current_lng double precision,
  last_location_update timestamptz,
  destination_visibility text,
  destination_name text,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_profile_id uuid;
BEGIN
  -- Get viewer's profile ID
  SELECT p.id INTO v_viewer_profile_id FROM profiles p WHERE p.user_id = auth.uid();
  
  -- Check if viewer is an attendee or creator of this event
  IF NOT EXISTS (
    SELECT 1 FROM event_attendees WHERE event_id = p_event_id AND profile_id = v_viewer_profile_id
    UNION
    SELECT 1 FROM events WHERE id = p_event_id AND creator_id = v_viewer_profile_id
  ) THEN
    RETURN; -- Not authorized to view this event's attendees
  END IF;

  RETURN QUERY
  SELECT 
    ea.id,
    ea.event_id,
    ea.profile_id,
    ea.status,
    ea.joined_at,
    ea.arrived_at,
    ea.arrived_home,
    ea.going_home_at,
    ea.share_location,
    -- Only show location if share_location is enabled OR it's the viewer's own row
    CASE 
      WHEN ea.share_location = true THEN ea.current_lat 
      WHEN ea.profile_id = v_viewer_profile_id THEN ea.current_lat
      ELSE NULL 
    END as current_lat,
    CASE 
      WHEN ea.share_location = true THEN ea.current_lng 
      WHEN ea.profile_id = v_viewer_profile_id THEN ea.current_lng
      ELSE NULL 
    END as current_lng,
    CASE 
      WHEN ea.share_location = true THEN ea.last_location_update 
      WHEN ea.profile_id = v_viewer_profile_id THEN ea.last_location_update
      ELSE NULL 
    END as last_location_update,
    ea.destination_visibility,
    -- Check destination visibility permissions
    CASE 
      WHEN ea.profile_id = v_viewer_profile_id THEN ea.destination_name -- Own row
      WHEN ea.destination_visibility = 'all' THEN ea.destination_name
      WHEN ea.destination_visibility = 'selected' AND v_viewer_profile_id = ANY(ea.destination_shared_with) THEN ea.destination_name
      ELSE NULL
    END as destination_name,
    p.display_name,
    p.avatar_url
  FROM event_attendees ea
  JOIN profiles p ON p.id = ea.profile_id
  WHERE ea.event_id = p_event_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_event_attendees_safe(uuid) TO authenticated;