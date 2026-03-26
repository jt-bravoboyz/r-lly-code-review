DROP POLICY IF EXISTS "Attendees can view cohosts" ON public.event_cohosts;

CREATE POLICY "Event members can view cohosts"
ON public.event_cohosts
FOR SELECT
TO authenticated
USING (
  public.is_event_member(event_id)
);