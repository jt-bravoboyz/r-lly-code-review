-- 1. Allow ALL event attendees to upload media (not just hosts)
DROP POLICY IF EXISTS "Hosts can add rally media" ON public.rally_media;
CREATE POLICY "Event attendees can add rally media" ON public.rally_media
FOR INSERT TO authenticated
WITH CHECK (
  is_event_member(event_id)
  AND created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- 2. Allow attendees to delete their OWN media
DROP POLICY IF EXISTS "Hosts can delete rally media" ON public.rally_media;
CREATE POLICY "Creators and hosts can delete rally media" ON public.rally_media
FOR DELETE TO authenticated
USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR is_event_host_or_cohost(event_id, auth.uid())
);