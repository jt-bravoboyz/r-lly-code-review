ALTER TABLE public.rally_media
ADD COLUMN IF NOT EXISTS processing boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_rally_media_processing
  ON public.rally_media (processing)
  WHERE processing = true;