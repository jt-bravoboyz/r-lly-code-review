-- Add After R@lly location fields to events table for host to set
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS after_rally_location_name TEXT;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS after_rally_location_lat DOUBLE PRECISION;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS after_rally_location_lng DOUBLE PRECISION;