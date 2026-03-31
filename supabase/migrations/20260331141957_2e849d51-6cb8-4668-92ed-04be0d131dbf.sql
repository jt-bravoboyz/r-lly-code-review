
-- 1. Create squad_media table
CREATE TABLE public.squad_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.squad_media ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Members/owners can view squad media
CREATE POLICY "Squad members can view media"
  ON public.squad_media FOR SELECT
  TO authenticated
  USING (is_squad_member_or_owner(squad_id));

-- 4. RLS: Members/owners can insert media
CREATE POLICY "Squad members can upload media"
  ON public.squad_media FOR INSERT
  TO authenticated
  WITH CHECK (
    is_squad_member_or_owner(squad_id)
    AND uploader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- 5. RLS: Uploader or squad owner can delete media
CREATE POLICY "Uploader or owner can delete media"
  ON public.squad_media FOR DELETE
  TO authenticated
  USING (
    uploader_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR squad_id IN (SELECT id FROM squads WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- 6. Tighten storage: drop old permissive INSERT/DELETE policies
DROP POLICY IF EXISTS "Authenticated users can upload squad images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete squad images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update squad images" ON storage.objects;

-- 7. New storage INSERT: only squad members/owners
CREATE POLICY "Squad members can upload squad images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'squad-images'
    AND is_squad_member_or_owner((storage.foldername(name))[1]::uuid)
  );

-- 8. New storage DELETE: only squad members/owners
CREATE POLICY "Squad members can delete squad images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'squad-images'
    AND is_squad_member_or_owner((storage.foldername(name))[1]::uuid)
  );

-- 9. New storage UPDATE: only squad members/owners
CREATE POLICY "Squad members can update squad images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'squad-images'
    AND is_squad_member_or_owner((storage.foldername(name))[1]::uuid)
  );
