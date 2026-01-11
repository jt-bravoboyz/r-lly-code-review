-- Fix chat RLS for event attendees when the event uses a linked squad chat
DROP POLICY IF EXISTS "Event attendees can view event chat messages" ON public.messages;
DROP POLICY IF EXISTS "Event attendees can send messages to event chats" ON public.messages;

CREATE POLICY "Event attendees can view event chat messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM chats c
    JOIN event_attendees ea
      ON ea.event_id = COALESCE(c.event_id, c.linked_event_id)
    WHERE c.id = messages.chat_id
      AND COALESCE(c.event_id, c.linked_event_id) IS NOT NULL
      AND ea.profile_id IN (
        SELECT profiles.id
        FROM profiles
        WHERE profiles.user_id = auth.uid()
      )
  )
);

CREATE POLICY "Event attendees can send messages to event chats"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM chats c
    JOIN event_attendees ea
      ON ea.event_id = COALESCE(c.event_id, c.linked_event_id)
    WHERE c.id = messages.chat_id
      AND COALESCE(c.event_id, c.linked_event_id) IS NOT NULL
      AND ea.profile_id IN (
        SELECT profiles.id
        FROM profiles
        WHERE profiles.user_id = auth.uid()
      )
  )
);

-- Fix infinite recursion in ride_passengers SELECT policy
DROP POLICY IF EXISTS "Ride participants can view passengers" ON public.ride_passengers;

CREATE POLICY "Ride participants can view passengers"
ON public.ride_passengers
FOR SELECT
USING (
  -- Drivers can see passengers for rides they drive
  ride_id IN (
    SELECT rides.id
    FROM rides
    WHERE rides.driver_id IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
  -- Riders can always see their own requests
  OR passenger_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);
