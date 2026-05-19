-- Flyer engine columns on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS flyer_theme text NOT NULL DEFAULT 'rally_dynamic',
  ADD COLUMN IF NOT EXISTS flyer_custom_image_url text,
  ADD COLUMN IF NOT EXISTS flyer_og_url text,
  ADD COLUMN IF NOT EXISTS flyer_og_generated_at timestamptz;

-- Constrain to known theme keys
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_flyer_theme_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_flyer_theme_check CHECK (flyer_theme IN (
    'rally_dynamic','tequila_sunset','midnight_disco','garden_party',
    'neon_warehouse','sunday_brunch','golden_hour','game_day','beach_club'
  ));

-- Standalone tab flyer cache
ALTER TABLE public.split_check_requests
  ADD COLUMN IF NOT EXISTS flyer_og_url text,
  ADD COLUMN IF NOT EXISTS flyer_og_generated_at timestamptz;

-- Auto-invalidate cached flyer when event identity-bearing fields change
CREATE OR REPLACE FUNCTION public.invalidate_event_flyer_cache()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.location_name IS DISTINCT FROM OLD.location_name
    OR NEW.flyer_theme IS DISTINCT FROM OLD.flyer_theme
    OR NEW.flyer_custom_image_url IS DISTINCT FROM OLD.flyer_custom_image_url
  ) THEN
    NEW.flyer_og_url := NULL;
    NEW.flyer_og_generated_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invalidate_event_flyer_cache ON public.events;
CREATE TRIGGER trg_invalidate_event_flyer_cache
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_event_flyer_cache();

-- Public flyer bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event_flyers', 'event_flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event_flyers (folder = event_id or tab_<requestId>)
DROP POLICY IF EXISTS "Event flyers are publicly readable" ON storage.objects;
CREATE POLICY "Event flyers are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event_flyers');

DROP POLICY IF EXISTS "Service role manages event flyers" ON storage.objects;
CREATE POLICY "Service role manages event flyers"
  ON storage.objects FOR ALL
  USING (bucket_id = 'event_flyers' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'event_flyers' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Hosts can manage their event flyer files" ON storage.objects;
CREATE POLICY "Hosts can manage their event flyer files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'event_flyers'
    AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.id = e.creator_id
      WHERE p.user_id = auth.uid()
        AND e.id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'event_flyers'
    AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.id = e.creator_id
      WHERE p.user_id = auth.uid()
        AND e.id::text = (storage.foldername(name))[1]
    )
  );