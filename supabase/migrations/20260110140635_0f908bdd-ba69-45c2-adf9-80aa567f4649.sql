-- ============================================
-- CREATE SECURE VIEWS FOR COLUMN-LEVEL SECURITY
-- ============================================

-- 1. Create a safe profiles view for connected users (excludes sensitive data)
CREATE OR REPLACE VIEW public.safe_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  badges,
  reward_points,
  created_at
  -- Excludes: phone, home_address, current_lat, current_lng, last_location_update
FROM public.profiles;

-- 2. Create a safe event_attendees view that hides location unless shared
CREATE OR REPLACE VIEW public.safe_event_attendees
WITH (security_invoker = true)
AS
SELECT 
  id,
  event_id,
  profile_id,
  status,
  joined_at,
  arrived_at,
  -- Only show location data if share_location is true
  CASE WHEN share_location = true THEN current_lat ELSE NULL END as current_lat,
  CASE WHEN share_location = true THEN current_lng ELSE NULL END as current_lng,
  CASE WHEN share_location = true THEN last_location_update ELSE NULL END as last_location_update,
  -- Hide home destination data from other users - this requires knowing who is querying
  -- For now, include going_home_at but hide destination details
  going_home_at,
  arrived_home,
  share_location
  -- Excludes: destination_lat, destination_lng, destination_name (always hidden in view)
FROM public.event_attendees;

-- 3. Fix push_subscriptions - the current policy is correct but let's verify with explicit checks
-- The existing policy is fine: auth.uid() = (SELECT profiles.user_id FROM profiles WHERE profiles.id = push_subscriptions.profile_id)

-- 4. Fix messages - remove the OR condition that allows event attendees to see all messages
DROP POLICY IF EXISTS "Chat members can view messages" ON public.messages;

CREATE POLICY "Chat participants can view messages"
ON public.messages
FOR SELECT
USING (
  -- Only actual chat participants can view messages
  chat_id IN (
    SELECT chat_id FROM chat_participants 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 5. Update chats policy to be more restrictive
DROP POLICY IF EXISTS "Participants can view chats" ON public.chats;

CREATE POLICY "Chat participants can view chats"
ON public.chats
FOR SELECT
USING (
  -- Must be an actual chat participant
  id IN (
    SELECT chat_id FROM chat_participants 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  -- Or the event creator for event chats
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);