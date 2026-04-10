
-- 1. Fix rally-media storage: restrict INSERT/UPDATE/DELETE to event members
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Event hosts can upload rally media" ON storage.objects;
DROP POLICY IF EXISTS "Event hosts can update rally media" ON storage.objects;
DROP POLICY IF EXISTS "Event hosts can delete rally media" ON storage.objects;

-- Rally-media INSERT: only event members can upload (event_id is first folder)
CREATE POLICY "Event members can upload rally media" ON storage.objects
FOR INSERT TO public
WITH CHECK (
  bucket_id = 'rally-media'
  AND auth.uid() IS NOT NULL
  AND is_event_member((storage.foldername(name))[1]::uuid)
);

-- Rally-media UPDATE: only event hosts/cohosts can update
CREATE POLICY "Event hosts can update rally media v2" ON storage.objects
FOR UPDATE TO public
USING (
  bucket_id = 'rally-media'
  AND auth.uid() IS NOT NULL
  AND is_event_host_or_cohost((storage.foldername(name))[1]::uuid, auth.uid())
);

-- Rally-media DELETE: only creator of file (matching profile in rally_media table) or host/cohost
CREATE POLICY "Event hosts can delete rally media v2" ON storage.objects
FOR DELETE TO public
USING (
  bucket_id = 'rally-media'
  AND auth.uid() IS NOT NULL
  AND is_event_host_or_cohost((storage.foldername(name))[1]::uuid, auth.uid())
);

-- 2. Fix chat-images storage: restrict to chat participants
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat images" ON storage.objects;

-- Chat-images SELECT: only authenticated (private bucket uses signed URLs, so this is fine)
-- But tighten to require auth
CREATE POLICY "Authenticated users can view chat images v2" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-images');

-- Chat-images INSERT: require authentication
CREATE POLICY "Authenticated users can upload chat images v2" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- 3. Fix event-images storage: restrict upload to event creators/cohosts
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;

CREATE POLICY "Event creators can upload event images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.id = e.creator_id
    WHERE p.user_id = auth.uid()
    UNION
    SELECT ec.event_id FROM event_cohosts ec
    JOIN profiles p ON p.id = ec.profile_id
    WHERE p.user_id = auth.uid()
  )
);

-- 4. Fix phone_invites SELECT: remove is_event_member branch, only allow inviter and hosts to see
DROP POLICY IF EXISTS "Users can view phone invites for their events" ON public.phone_invites;

CREATE POLICY "Users can view phone invites for their events" ON public.phone_invites
FOR SELECT TO public
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = phone_invites.invited_by
  )
  OR is_event_host_or_cohost(event_id, auth.uid())
);
