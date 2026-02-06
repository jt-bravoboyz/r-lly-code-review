-- RLS fix: allow legacy inserts that mistakenly send auth.uid() into event_attendees.profile_id
-- RLS is evaluated before BEFORE INSERT triggers, so we must permit the legacy value,
-- then the trigger can normalize profile_id to the correct profiles.id.

DROP POLICY IF EXISTS "Users can join events" ON public.event_attendees;

CREATE POLICY "Users can join events"
ON public.event_attendees
FOR INSERT
TO authenticated
WITH CHECK (
  -- Correct path: client provides profiles.id
  profile_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
  OR
  -- Legacy path: client mistakenly provides auth.uid(); trigger will normalize.
  profile_id = auth.uid()
);
