-- Strengthen normalization: always force event_attendees.profile_id to the caller's profile_id
CREATE OR REPLACE FUNCTION public.normalize_event_attendee_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Look up the caller's profile id
  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  -- If we can't find a profile, let the insert fail naturally elsewhere.
  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Always normalize to the caller's profile id.
  -- This prevents any legacy/buggy client from inserting auth.uid() or any other uuid.
  NEW.profile_id := v_profile_id;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_normalize_event_attendee_profile_id ON public.event_attendees;
CREATE TRIGGER trg_normalize_event_attendee_profile_id
BEFORE INSERT ON public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION public.normalize_event_attendee_profile_id();
