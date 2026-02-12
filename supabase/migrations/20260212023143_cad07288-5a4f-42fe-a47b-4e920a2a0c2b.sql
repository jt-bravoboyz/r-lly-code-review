
-- Create rally-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('rally-media', 'rally-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rally-media bucket
CREATE POLICY "Anyone can view rally media"
ON storage.objects FOR SELECT
USING (bucket_id = 'rally-media');

CREATE POLICY "Event hosts can upload rally media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rally-media'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Event hosts can update rally media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'rally-media'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Event hosts can delete rally media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rally-media'
  AND auth.uid() IS NOT NULL
);

-- Create rally_media table
CREATE TABLE public.rally_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rally_media ENABLE ROW LEVEL SECURITY;

-- Anyone attending the event can view media
CREATE POLICY "Event members can view rally media"
ON public.rally_media FOR SELECT
USING (public.is_event_member(event_id));

-- Only host/cohost can insert media
CREATE POLICY "Hosts can add rally media"
ON public.rally_media FOR INSERT
WITH CHECK (
  public.is_event_host_or_cohost(event_id, auth.uid())
  AND created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Only host/cohost can update media
CREATE POLICY "Hosts can update rally media"
ON public.rally_media FOR UPDATE
USING (public.is_event_host_or_cohost(event_id, auth.uid()));

-- Only host/cohost can delete media
CREATE POLICY "Hosts can delete rally media"
ON public.rally_media FOR DELETE
USING (public.is_event_host_or_cohost(event_id, auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_rally_media_event_id ON public.rally_media(event_id);
