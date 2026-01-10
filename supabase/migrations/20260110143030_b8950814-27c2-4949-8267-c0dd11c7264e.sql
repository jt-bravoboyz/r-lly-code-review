-- ============================================
-- ADD DESTINATION PRIVACY CONTROLS
-- ============================================

-- Add destination visibility column to event_attendees
-- Options: 'none' (only user), 'squad' (squad members), 'selected' (specific people), 'all' (all event members)
ALTER TABLE public.event_attendees
ADD COLUMN IF NOT EXISTS destination_visibility text DEFAULT 'none';

-- Add array to store specific profile IDs who can see destination
ALTER TABLE public.event_attendees
ADD COLUMN IF NOT EXISTS destination_shared_with uuid[] DEFAULT '{}';

-- Create a security definer function to check if user can see another user's destination
CREATE OR REPLACE FUNCTION public.can_see_destination(
  viewer_user_id uuid,
  attendee_profile_id uuid,
  attendee_event_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_profile_id uuid;
  attendee_visibility text;
  attendee_shared_with uuid[];
BEGIN
  -- Get viewer's profile ID
  SELECT id INTO viewer_profile_id FROM profiles WHERE user_id = viewer_user_id;
  
  IF viewer_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- User can always see their own destination
  IF viewer_profile_id = attendee_profile_id THEN
    RETURN true;
  END IF;
  
  -- Get attendee's visibility settings
  SELECT destination_visibility, destination_shared_with 
  INTO attendee_visibility, attendee_shared_with
  FROM event_attendees
  WHERE profile_id = attendee_profile_id AND event_id = attendee_event_id;
  
  -- Check based on visibility setting
  IF attendee_visibility = 'none' THEN
    RETURN false;
  ELSIF attendee_visibility = 'all' THEN
    -- Check if viewer is attending the same event
    RETURN EXISTS (
      SELECT 1 FROM event_attendees 
      WHERE event_id = attendee_event_id AND profile_id = viewer_profile_id
    );
  ELSIF attendee_visibility = 'squad' THEN
    -- Check if viewer and attendee are in the same squad
    RETURN EXISTS (
      SELECT 1 FROM squad_members sm1
      JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
      WHERE sm1.profile_id = viewer_profile_id AND sm2.profile_id = attendee_profile_id
    );
  ELSIF attendee_visibility = 'selected' THEN
    -- Check if viewer is in the shared_with list
    RETURN viewer_profile_id = ANY(attendee_shared_with);
  END IF;
  
  RETURN false;
END;
$$;

-- Update the safe_event_attendees view to include visibility-aware destination
DROP VIEW IF EXISTS public.safe_event_attendees;
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
  ea.share_location,
  ea.destination_visibility,
  -- Location only visible if share_location is enabled
  CASE WHEN ea.share_location = true THEN ea.current_lat ELSE NULL END as current_lat,
  CASE WHEN ea.share_location = true THEN ea.current_lng ELSE NULL END as current_lng,
  CASE WHEN ea.share_location = true THEN ea.last_location_update ELSE NULL END as last_location_update,
  ea.going_home_at,
  ea.arrived_home,
  -- Destination only visible based on visibility settings
  CASE WHEN public.can_see_destination(auth.uid(), ea.profile_id, ea.event_id) 
       THEN ea.destination_name 
       ELSE NULL 
  END as destination_name
FROM public.event_attendees ea;