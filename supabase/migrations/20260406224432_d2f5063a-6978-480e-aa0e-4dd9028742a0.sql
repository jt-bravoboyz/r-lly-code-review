ALTER TABLE public.rogue_alerts
  ADD CONSTRAINT rogue_alerts_event_profile_unique UNIQUE (event_id, profile_id);