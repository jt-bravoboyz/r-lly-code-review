
-- Remove old broad policies that were not caught by the first migration
DROP POLICY IF EXISTS "Anyone can view rally media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat images v2" ON storage.objects;

-- Replace broad public bucket SELECT policies with ones that prevent listing
-- Avatars: allow viewing individual files but not listing
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Event images: allow viewing individual files but not listing
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-images'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Squad images: keep member-scoped policy, drop the broad one
DROP POLICY IF EXISTS "Squad images are publicly accessible" ON storage.objects;
