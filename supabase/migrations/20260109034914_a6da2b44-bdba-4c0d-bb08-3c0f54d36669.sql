-- Add invite_code column to events for shareable links
ALTER TABLE public.events 
ADD COLUMN invite_code VARCHAR(8) UNIQUE;

-- Add is_quick_rally flag to distinguish quick rallies
ALTER TABLE public.events 
ADD COLUMN is_quick_rally BOOLEAN DEFAULT false;

-- Create function to generate random invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substr(md5(random()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate invite code
CREATE TRIGGER generate_event_invite_code
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invite_code();

-- Update existing events with invite codes
UPDATE public.events 
SET invite_code = upper(substr(md5(random()::text), 1, 6))
WHERE invite_code IS NULL;