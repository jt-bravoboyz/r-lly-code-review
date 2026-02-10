-- Add needs_ride flag to event_attendees for broadcast ride requests
ALTER TABLE public.event_attendees ADD COLUMN IF NOT EXISTS needs_ride boolean DEFAULT false;
ALTER TABLE public.event_attendees ADD COLUMN IF NOT EXISTS ride_requested_at timestamptz DEFAULT null;
ALTER TABLE public.event_attendees ADD COLUMN IF NOT EXISTS ride_pickup_location text DEFAULT null;
ALTER TABLE public.event_attendees ADD COLUMN IF NOT EXISTS ride_pickup_lat double precision DEFAULT null;
ALTER TABLE public.event_attendees ADD COLUMN IF NOT EXISTS ride_pickup_lng double precision DEFAULT null;