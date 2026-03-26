ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cover_charge numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_check boolean DEFAULT false;