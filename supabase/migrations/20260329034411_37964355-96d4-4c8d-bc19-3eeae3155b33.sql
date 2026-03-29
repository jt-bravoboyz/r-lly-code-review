-- Allow any authenticated squad member to view squad images
CREATE POLICY "Squad members can view squad images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'squad-images'
  AND (storage.foldername(name))[1] IN (
    SELECT sm.squad_id::text
    FROM public.squad_members sm
    JOIN public.profiles p ON p.id = sm.profile_id
    WHERE p.user_id = auth.uid()
    UNION
    SELECT s.id::text
    FROM public.squads s
    WHERE s.owner_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
);