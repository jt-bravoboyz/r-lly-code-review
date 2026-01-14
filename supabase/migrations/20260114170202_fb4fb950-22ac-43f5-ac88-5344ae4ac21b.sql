-- Add group_photo_url column to squads table
ALTER TABLE public.squads 
ADD COLUMN IF NOT EXISTS group_photo_url TEXT;

-- Create storage bucket for squad images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('squad-images', 'squad-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Squad images are publicly accessible
CREATE POLICY "Squad images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'squad-images');

-- Storage policy: Authenticated users can upload squad images
CREATE POLICY "Authenticated users can upload squad images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'squad-images' 
  AND auth.uid() IS NOT NULL
);

-- Storage policy: Authenticated users can update squad images
CREATE POLICY "Authenticated users can update squad images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'squad-images' 
  AND auth.uid() IS NOT NULL
);

-- Storage policy: Authenticated users can delete squad images
CREATE POLICY "Authenticated users can delete squad images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'squad-images' 
  AND auth.uid() IS NOT NULL
);