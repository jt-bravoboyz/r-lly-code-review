-- 1) rogue_polls table
CREATE TABLE IF NOT EXISTS public.rogue_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rogue_alert_id UUID NOT NULL REFERENCES public.rogue_alerts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('bar','home','unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rogue_alert_id, profile_id)
);

ALTER TABLE public.rogue_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view rogue polls"
  ON public.rogue_polls FOR SELECT TO authenticated
  USING (
    rogue_alert_id IN (
      SELECT ra.id FROM public.rogue_alerts ra WHERE public.is_event_member(ra.event_id)
    )
  );

CREATE POLICY "Users can insert own rogue polls"
  ON public.rogue_polls FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND rogue_alert_id IN (
      SELECT ra.id FROM public.rogue_alerts ra WHERE public.is_event_member(ra.event_id)
    )
  );

CREATE POLICY "Users can update own rogue polls"
  ON public.rogue_polls FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.rogue_polls;

-- 2) Tighten rally_media INSERT to enforce 24h post-completion window
DROP POLICY IF EXISTS "Event attendees can add rally media" ON public.rally_media;
CREATE POLICY "Event attendees can add rally media (24h post-event)"
  ON public.rally_media
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_event_member(event_id)
    AND created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND (
          e.status IN ('scheduled','live','after_rally')
          OR (e.status = 'completed' AND e.updated_at > now() - interval '24 hours')
        )
    )
  );

-- 3) Tighten storage rally-media INSERT to same 24h window
DROP POLICY IF EXISTS "Event members can upload rally-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload rally-media" ON storage.objects;
CREATE POLICY "Event members can upload rally-media (24h post-event)"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rally-media'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND public.is_event_member(e.id)
        AND (
          e.status IN ('scheduled','live','after_rally')
          OR (e.status = 'completed' AND e.updated_at > now() - interval '24 hours')
        )
    )
  );
