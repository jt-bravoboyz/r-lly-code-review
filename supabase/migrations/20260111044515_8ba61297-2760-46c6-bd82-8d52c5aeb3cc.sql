-- =============================================
-- COMPLETE CHAT AND RIDES TEARDOWN AND REBUILD
-- =============================================

-- PART 1: DROP ALL BROKEN RLS POLICIES
-- =============================================

-- Drop broken chat_participants policies
DROP POLICY IF EXISTS "Participants visible to chat members" ON public.chat_participants;

-- Drop broken chats policies
DROP POLICY IF EXISTS "Chat participants can view chats" ON public.chats;

-- Drop broken messages policies (the recursive one)
DROP POLICY IF EXISTS "Chat participants can view messages" ON public.messages;

-- Drop redundant/overlapping message policies to clean up
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;

-- PART 2: CREATE SECURITY DEFINER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Direct participant in chat_participants
    SELECT 1 FROM chat_participants cp
    JOIN profiles p ON p.id = cp.profile_id
    WHERE cp.chat_id = p_chat_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- Event attendee (for event chats via event_id)
    SELECT 1 FROM chats c
    JOIN event_attendees ea ON ea.event_id = c.event_id
    JOIN profiles p ON p.id = ea.profile_id
    WHERE c.id = p_chat_id AND c.event_id IS NOT NULL AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- Event attendee (for event chats via linked_event_id)
    SELECT 1 FROM chats c
    JOIN event_attendees ea ON ea.event_id = c.linked_event_id
    JOIN profiles p ON p.id = ea.profile_id
    WHERE c.id = p_chat_id AND c.linked_event_id IS NOT NULL AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- Squad owner (for squad chats)
    SELECT 1 FROM chats c
    JOIN squads s ON s.id = c.squad_id
    JOIN profiles p ON p.id = s.owner_id
    WHERE c.id = p_chat_id AND c.squad_id IS NOT NULL AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- Squad member (for squad chats)
    SELECT 1 FROM chats c
    JOIN squad_members sm ON sm.squad_id = c.squad_id
    JOIN profiles p ON p.id = sm.profile_id
    WHERE c.id = p_chat_id AND c.squad_id IS NOT NULL AND p.user_id = auth.uid()
  )
$$;

-- PART 3: CREATE CLEAN RLS POLICIES
-- =============================================

-- chat_participants: Users can view participants of chats they belong to
CREATE POLICY "Users can view chat participants they belong to"
ON public.chat_participants FOR SELECT
TO authenticated
USING (public.is_chat_member(chat_id));

-- chats: Users can view chats they belong to
CREATE POLICY "Users can view chats they belong to"
ON public.chats FOR SELECT
TO authenticated
USING (public.is_chat_member(id));

-- messages: Users can view messages in chats they belong to
CREATE POLICY "Users can view messages in chats they belong to"
ON public.messages FOR SELECT
TO authenticated
USING (public.is_chat_member(chat_id));

-- PART 4: FIX RIDE STATUS VALUES
-- =============================================

-- Update all rides with 'active' status to 'available'
UPDATE public.rides SET status = 'available' WHERE status = 'active';

-- Update any NULL status to 'available'
UPDATE public.rides SET status = 'available' WHERE status IS NULL;

-- PART 5: ENABLE REALTIME FOR RIDES
-- =============================================

-- Enable realtime for rides table (for cross-surface sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- Enable realtime for ride_passengers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_passengers;