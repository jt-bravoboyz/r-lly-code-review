-- Phase 1A: Prevent double-booking on ride requests
CREATE OR REPLACE FUNCTION public.prevent_duplicate_ride_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT event_id INTO v_event_id FROM public.rides WHERE id = NEW.ride_id;
  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ride_passengers rp
    JOIN public.rides r ON r.id = rp.ride_id
    WHERE rp.passenger_id = NEW.passenger_id
      AND r.event_id = v_event_id
      AND rp.status IN ('pending','accepted')
      AND rp.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'You already have an active ride request for this R@lly'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_ride_request ON public.ride_passengers;
CREATE TRIGGER trg_prevent_duplicate_ride_request
BEFORE INSERT ON public.ride_passengers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_ride_request();

-- Phase 1B: Update auto_complete_stale_rallies to include deep-link URL
CREATE OR REPLACE FUNCTION public.auto_complete_stale_rallies()
RETURNS TABLE(event_id uuid, title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event record;
BEGIN
  FOR v_event IN
    SELECT e.id, e.title, e.creator_id
    FROM public.events e
    WHERE e.status IN ('scheduled', 'live', 'after_rally')
      AND COALESCE(e.end_time, e.start_time) < now() - interval '8 hours'
  LOOP
    UPDATE public.events
    SET status = 'completed', updated_at = now()
    WHERE id = v_event.id;

    UPDATE public.rides
    SET status = 'ended', updated_at = now()
    WHERE event_id = v_event.id
      AND status NOT IN ('ended', 'canceled', 'completed');

    INSERT INTO public.notifications (profile_id, type, title, body, data, read)
    VALUES (
      v_event.creator_id,
      'event_update',
      'R@lly auto-archived',
      '"' || COALESCE(v_event.title, 'Your R@lly') || '" was automatically archived after 8 hours',
      jsonb_build_object(
        'event_id', v_event.id,
        'url', '/events/' || v_event.id::text,
        'dedupe_key', 'auto-archive:' || v_event.id::text
      ),
      false
    );

    event_id := v_event.id;
    title := v_event.title;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- Phase 1C: Admin invite history view (ignores hidden_at for accurate analytics)
CREATE OR REPLACE VIEW public.admin_invite_history_view
WITH (security_invoker = true) AS
SELECT *
FROM public.invite_history
WHERE public.has_role(auth.uid(), 'admin'::app_role);

REVOKE ALL ON public.admin_invite_history_view FROM anon;
GRANT SELECT ON public.admin_invite_history_view TO authenticated;