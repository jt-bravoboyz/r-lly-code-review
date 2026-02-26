
-- BUG-2: Add ride dropoff columns to event_attendees
ALTER TABLE public.event_attendees
  ADD COLUMN IF NOT EXISTS ride_dropoff_location text,
  ADD COLUMN IF NOT EXISTS ride_dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS ride_dropoff_lng double precision;

-- ARCH-1: Create transition_event_status RPC
CREATE OR REPLACE FUNCTION public.transition_event_status(p_event_id uuid, p_new_status text)
RETURNS events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
  v_event public.events;
BEGIN
  -- Validate caller is host or cohost
  IF NOT public.is_event_host_or_cohost(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only hosts and co-hosts can change event status';
  END IF;

  -- Get current status
  SELECT status INTO v_current_status
  FROM public.events
  WHERE id = p_event_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Validate transition
  IF NOT (
    (v_current_status = 'scheduled' AND p_new_status = 'live') OR
    (v_current_status = 'live' AND p_new_status = 'after_rally') OR
    (v_current_status = 'live' AND p_new_status = 'completed') OR
    (v_current_status = 'after_rally' AND p_new_status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
  END IF;

  -- Perform the update
  UPDATE public.events
  SET status = p_new_status, updated_at = now()
  WHERE id = p_event_id
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$function$;
