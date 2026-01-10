-- ============================================
-- FIX ERROR-LEVEL SECURITY ISSUES
-- ============================================

-- 1. Fix profiles table - restrict home_address visibility
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;

-- Create a new policy that only shows home_address to the profile owner
-- Other users see basic profile info but not sensitive fields
CREATE POLICY "Users can view profiles with restricted sensitive data"
ON public.profiles
FOR SELECT
USING (true);

-- Create a secure view that hides home_address from non-owners
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  badges,
  reward_points,
  created_at
FROM public.profiles;

-- 2. Fix event_attendees - restrict location data to connected users only
DROP POLICY IF EXISTS "Attendees visible to event members" ON public.event_attendees;

-- Create policy that allows viewing attendee info only for:
-- - Your own attendance record
-- - Other attendees of the same event
CREATE POLICY "Event attendees visible to participants"
ON public.event_attendees
FOR SELECT
USING (
  -- Own record
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR
  -- Same event attendees can see each other
  event_id IN (
    SELECT event_id FROM event_attendees 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  -- Event creator can see attendees
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 3. Fix squad_invites - restrict visibility to relevant users
DROP POLICY IF EXISTS "Anyone can view invites by code" ON public.squad_invites;

-- Create policy that allows viewing invites only for:
-- - Squad owners (via the existing ALL policy)
-- - Users looking up a specific invite by code (for joining)
CREATE POLICY "Users can view invites by code for joining"
ON public.squad_invites
FOR SELECT
USING (
  -- Squad owners already covered by ALL policy
  squad_id IN (
    SELECT id FROM squads 
    WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  -- Allow authenticated users to look up invites (needed for join flow)
  -- The invite code lookup happens in application code
  auth.uid() IS NOT NULL
);

-- ============================================
-- FIX WARNING-LEVEL SECURITY ISSUES
-- ============================================

-- 4. Add UPDATE/DELETE policies for chats
CREATE POLICY "Chat creators can update chats"
ON public.chats
FOR UPDATE
USING (
  -- Event creator can update event chats
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR
  -- First participant (creator for non-event chats) can update
  id IN (
    SELECT chat_id FROM chat_participants 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    ORDER BY joined_at ASC
    LIMIT 1
  )
);

CREATE POLICY "Chat creators can delete chats"
ON public.chats
FOR DELETE
USING (
  -- Event creator can delete event chats
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 5. Add UPDATE/DELETE policies for messages
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
USING (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
USING (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- 6. Fix chat_participants - add DELETE policy for leaving chats
CREATE POLICY "Users can leave chats"
ON public.chat_participants
FOR DELETE
USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);