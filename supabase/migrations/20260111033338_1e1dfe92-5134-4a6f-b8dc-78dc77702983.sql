-- Add RLS policy to allow event attendees to view event chat messages
CREATE POLICY "Event attendees can view event chat messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats c
    JOIN event_attendees ea ON ea.event_id = c.event_id
    JOIN profiles p ON p.id = ea.profile_id
    WHERE c.id = messages.chat_id 
    AND c.event_id IS NOT NULL
    AND p.user_id = auth.uid()
  )
);

-- Add RLS policy to allow event attendees to send messages to event chats
CREATE POLICY "Event attendees can send messages to event chats"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM chats c
    JOIN event_attendees ea ON ea.event_id = c.event_id
    JOIN profiles p ON p.id = ea.profile_id
    WHERE c.id = messages.chat_id 
    AND c.event_id IS NOT NULL
    AND p.user_id = auth.uid()
  )
);