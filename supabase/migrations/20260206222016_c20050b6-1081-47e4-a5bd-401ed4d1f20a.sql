-- Fix: normalize event_attendees.profile_id on INSERT to prevent RLS failures
-- Some legacy client paths may still insert auth.uid() instead of profiles.id.

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

  -- If the client passed auth.uid() (or omitted profile_id), normalize it.
  IF NEW.profile_id IS NULL OR NEW.profile_id = auth.uid() THEN
    NEW.profile_id := v_profile_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_event_attendee_profile_id ON public.event_attendees;

CREATE TRIGGER trg_normalize_event_attendee_profile_id
BEFORE INSERT ON public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION public.normalize_event_attendee_profile_id();
