-- Fix: SECURITY DEFINER RPCs run under the definer role, so policies limited to TO authenticated may not apply when FORCE RLS is enabled.
-- Make the insert policy apply to all roles, but still require auth.uid() (i.e., a real signed-in user).

DROP POLICY IF EXISTS "Users can join events" ON public.event_attendees;

CREATE POLICY "Users can join events"
ON public.event_attendees
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Correct path: client provides profiles.id
    profile_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
    OR
    -- Legacy path: client mistakenly provides auth.uid(); trigger will normalize (if/when trigger exists)
    profile_id = auth.uid()
  )
);
