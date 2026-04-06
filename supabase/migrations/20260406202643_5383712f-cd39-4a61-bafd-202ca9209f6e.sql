
-- Table: rogue_alerts
CREATE TABLE public.rogue_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_words TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rogue_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view rogue alerts"
  ON public.rogue_alerts FOR SELECT TO authenticated
  USING (is_event_member(event_id));

CREATE POLICY "Users can insert own rogue alerts"
  ON public.rogue_alerts FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    AND is_event_member(event_id)
  );

-- Table: rogue_reactions
CREATE TABLE public.rogue_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rogue_alert_id UUID NOT NULL REFERENCES public.rogue_alerts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rogue_alert_id, profile_id)
);

ALTER TABLE public.rogue_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view rogue reactions"
  ON public.rogue_reactions FOR SELECT TO authenticated
  USING (
    rogue_alert_id IN (
      SELECT ra.id FROM rogue_alerts ra WHERE is_event_member(ra.event_id)
    )
  );

CREATE POLICY "Users can insert own rogue reactions"
  ON public.rogue_reactions FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Users can update own rogue reactions"
  ON public.rogue_reactions FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rogue_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rogue_reactions;
