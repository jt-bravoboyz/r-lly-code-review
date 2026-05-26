
-- 1) EVENTS: replace overly-broad SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

CREATE POLICY "Members, invitees, and admins can view events"
ON public.events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR id IN (
    SELECT event_id FROM public.event_cohosts
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR id IN (
    SELECT event_id FROM public.event_attendees
    WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR id IN (
    SELECT event_id FROM public.event_invites
    WHERE invited_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      AND status IN ('pending','accepted')
  )
);

-- 2) RECEIPTS bucket: restrict to event host/cohosts
DROP POLICY IF EXISTS "receipts auth read" ON storage.objects;
DROP POLICY IF EXISTS "receipts auth upload" ON storage.objects;
DROP POLICY IF EXISTS "receipts auth delete" ON storage.objects;

CREATE POLICY "receipts host read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_event_host_or_cohost(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "receipts host upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND public.is_event_host_or_cohost(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "receipts host delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_event_host_or_cohost(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 3) CHAT-IMAGES bucket: restrict to chat members.
--    Paths are `events/{eventId}/...` or `squads/{squadId}/...`.
DROP POLICY IF EXISTS "Authenticated users can upload chat images v2" ON storage.objects;
DROP POLICY IF EXISTS "chat-images members upload" ON storage.objects;
DROP POLICY IF EXISTS "chat-images members read" ON storage.objects;

CREATE POLICY "chat-images members read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (
    (
      (storage.foldername(name))[1] = 'events'
      AND public.is_event_member(((storage.foldername(name))[2])::uuid)
    )
    OR (
      (storage.foldername(name))[1] = 'squads'
      AND public.is_squad_member_or_owner(((storage.foldername(name))[2])::uuid)
    )
  )
);

CREATE POLICY "chat-images members upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (
    (
      (storage.foldername(name))[1] = 'events'
      AND public.is_event_member(((storage.foldername(name))[2])::uuid)
    )
    OR (
      (storage.foldername(name))[1] = 'squads'
      AND public.is_squad_member_or_owner(((storage.foldername(name))[2])::uuid)
    )
  )
);

-- 4) split_guest_tokens: add scoped SELECT policy so Realtime works and
--    PII access is explicit. Guest-pay flow uses service-role edge functions,
--    so no anon access is required here.
CREATE POLICY "Host or claimer can view guest tokens"
ON public.split_guest_tokens
FOR SELECT
TO authenticated
USING (
  request_id IN (
    SELECT id FROM public.split_check_requests
    WHERE host_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR claimed_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
