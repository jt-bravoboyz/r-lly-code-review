ALTER TABLE public.event_attendees
  ADD COLUMN IF NOT EXISTS arrival_transport_mode text,
  ADD COLUMN IF NOT EXISTS departure_transport_mode text,
  ADD COLUMN IF NOT EXISTS in_transit_rideshare_at timestamptz,
  ADD COLUMN IF NOT EXISTS departure_provider text;