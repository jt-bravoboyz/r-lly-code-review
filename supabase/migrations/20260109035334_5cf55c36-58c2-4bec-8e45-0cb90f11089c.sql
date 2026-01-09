-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for chat image uploads
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

-- Create policy for viewing chat images (public)
CREATE POLICY "Anyone can view chat images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-images');

-- Add image_url column to messages table for photo sharing
ALTER TABLE public.messages
ADD COLUMN image_url TEXT,
ADD COLUMN message_type TEXT DEFAULT 'text';