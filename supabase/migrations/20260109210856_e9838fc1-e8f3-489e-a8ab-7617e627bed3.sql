-- Fix 1: Chat creation authorization - restrict to event attendees/creators
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

CREATE POLICY "Event attendees can create chats" 
ON public.chats FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- User is an attendee of the event
    event_id IN (
      SELECT event_id FROM public.event_attendees 
      WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    -- Or user is the event creator
    OR event_id IN (
      SELECT id FROM public.events 
      WHERE creator_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    -- Or allow creating chats without events (DMs)
    OR event_id IS NULL
  )
);

-- Fix 2: Add fixed search_path to handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate input
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'Invalid user data: missing id';
  END IF;
  
  -- Insert profile with length-limited display name
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    SUBSTRING(
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      1, 100
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;