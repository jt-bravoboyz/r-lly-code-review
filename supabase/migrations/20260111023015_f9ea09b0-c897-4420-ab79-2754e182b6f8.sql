-- Phase C.1: Add event status field for bar hop mode
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live'));