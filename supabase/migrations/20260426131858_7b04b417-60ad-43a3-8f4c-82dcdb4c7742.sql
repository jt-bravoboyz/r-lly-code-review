-- Add UPDATE and DELETE policies for event-images bucket
-- Mirrors the existing INSERT policy: only event creators and co-hosts can modify

CREATE POLICY "Event creators can update event images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-images'
  AND ((storage.foldername(name))[1])::uuid IN (
    SELECT e.id FROM public.events e
    JOIN public.profiles p ON p.id = e.creator_id
    WHERE p.user_id = auth.uid()
    UNION
    SELECT ec.event_id FROM public.event_cohosts ec
    JOIN public.profiles p ON p.id = ec.profile_id
    WHERE p.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'event-images'
  AND ((storage.foldername(name))[1])::uuid IN (
    SELECT e.id FROM public.events e
    JOIN public.profiles p ON p.id = e.creator_id
    WHERE p.user_id = auth.uid()
    UNION
    SELECT ec.event_id FROM public.event_cohosts ec
    JOIN public.profiles p ON p.id = ec.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Event creators can delete event images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-images'
  AND ((storage.foldername(name))[1])::uuid IN (
    SELECT e.id FROM public.events e
    JOIN public.profiles p ON p.id = e.creator_id
    WHERE p.user_id = auth.uid()
    UNION
    SELECT ec.event_id FROM public.event_cohosts ec
    JOIN public.profiles p ON p.id = ec.profile_id
    WHERE p.user_id = auth.uid()
  )
);