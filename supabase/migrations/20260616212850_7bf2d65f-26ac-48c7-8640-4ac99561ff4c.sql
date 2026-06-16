ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status = ANY (ARRAY['scheduled'::text,'live'::text,'after_rally'::text,'completed'::text,'cancelled'::text]));