-- Allow event members to upload video thumbnail files anytime (no 24h window),
-- so the client-side opportunistic backfill can heal blank video tiles even
-- on legacy/past R@llies. Only matches *_thumb.{jpg|jpeg|png|webp} files in
-- the event folder, and still requires the caller to be an event member.
CREATE POLICY "Event members can upload rally-media thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rally-media'
    AND auth.uid() IS NOT NULL
    AND public.is_event_member(((storage.foldername(name))[1])::uuid)
    AND (
      lower(name) LIKE '%\_thumb.jpg'  ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.jpeg' ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.png'  ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.webp' ESCAPE '\'
    )
  );

-- Allow upsert (UPDATE) of those same thumbnail objects by any event member,
-- so re-uploads from the backfill don't fail when the file already exists.
CREATE POLICY "Event members can update rally-media thumbnails"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rally-media'
    AND auth.uid() IS NOT NULL
    AND public.is_event_member(((storage.foldername(name))[1])::uuid)
    AND (
      lower(name) LIKE '%\_thumb.jpg'  ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.jpeg' ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.png'  ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.webp' ESCAPE '\'
    )
  )
  WITH CHECK (
    bucket_id = 'rally-media'
    AND auth.uid() IS NOT NULL
    AND public.is_event_member(((storage.foldername(name))[1])::uuid)
    AND (
      lower(name) LIKE '%\_thumb.jpg'  ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.jpeg' ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.png'  ESCAPE '\'
      OR lower(name) LIKE '%\_thumb.webp' ESCAPE '\'
    )
  );