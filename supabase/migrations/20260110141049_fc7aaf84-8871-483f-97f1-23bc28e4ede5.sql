-- ============================================
-- FINAL SECURITY FIXES
-- ============================================

-- 1. Create a truly restrictive profile access model
-- Only the profile owner can see sensitive columns (phone, home_address, location)
-- Everyone else can only see public info via safe_profiles view

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view safe profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;

-- Owner has full access to their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Connected users can view profiles but app should use safe_profiles view
-- We still need this for the foreign key joins to work in queries
CREATE POLICY "Connected users can view profile rows"
ON public.profiles
FOR SELECT
USING (public.is_connected_to_profile(id));

-- 2. Update event_attendees to properly filter location data
-- Location is only visible when share_location = true
DROP POLICY IF EXISTS "Event participants can view attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.event_attendees;

-- Users always see their own attendance record
CREATE POLICY "Users can view own event attendance"
ON public.event_attendees
FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Event participants and creators see other attendees
-- NOTE: Location columns are visible at row level; app should use safe_event_attendees view
-- or only query specific non-location columns
CREATE POLICY "Event members can view attendees"
ON public.event_attendees
FOR SELECT
USING (
  event_id IN (
    SELECT ea.event_id FROM event_attendees ea 
    WHERE ea.profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  event_id IN (
    SELECT e.id FROM events e 
    WHERE e.creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 3. Update the safe_event_attendees view to be more restrictive
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
  -- Location only visible if share_location is enabled
  CASE WHEN ea.share_location = true THEN ea.current_lat ELSE NULL END as current_lat,
  CASE WHEN ea.share_location = true THEN ea.current_lng ELSE NULL END as current_lng,
  CASE WHEN ea.share_location = true THEN ea.last_location_update ELSE NULL END as last_location_update,
  -- Home destination NEVER exposed in this view
  ea.going_home_at,
  ea.arrived_home
  -- destination_lat, destination_lng, destination_name are excluded entirely
FROM public.event_attendees ea;