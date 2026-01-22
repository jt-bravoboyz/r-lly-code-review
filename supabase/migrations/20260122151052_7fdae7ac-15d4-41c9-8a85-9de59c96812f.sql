-- Drop the existing restrictive constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add new constraint with full event lifecycle statuses
ALTER TABLE public.events ADD CONSTRAINT events_status_check 
  CHECK (status = ANY (ARRAY['scheduled', 'live', 'after_rally', 'completed']));