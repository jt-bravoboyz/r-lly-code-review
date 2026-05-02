-- 1. Restore the simple SELECT policy on events. The parent R@lly is visible to
--    all signed-in users again. After R@lly *fields* are masked at read-time
--    via the helper functions below — the row itself is never hidden.
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

CREATE POLICY "Authenticated users can view events"
ON public.events
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Single-event safe reader. Returns the event row but masks the After R@lly
--    location and downgrades status to 'completed' for viewers who weren't
--    hand-picked for a stealth After R@lly.
CREATE OR REPLACE FUNCTION public.get_event_safe(p_event_id uuid)
RETURNS SETOF public.events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_profile_id uuid;
BEGIN
  SELECT id INTO v_viewer_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  SELECT
    e.id,
    e.creator_id,
    e.title,
    e.description,
    e.event_type,
    e.location_name,
    e.location_lat,
    e.location_lng,
    e.start_time,
    e.end_time,
    e.image_url,
    -- Status mask: stealth After R@lly reads as 'completed' to non-invited
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND e.status = 'after_rally'
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN 'completed'
      ELSE e.status
    END AS status,
    e.max_attendees,
    e.invite_code,
    e.is_barhop,
    e.created_at,
    e.updated_at,
    e.is_quick_rally,
    e.cover_charge,
    e.split_check,
    -- Mask After R@lly destination for non-invited
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN NULL
      ELSE e.after_rally_location_name
    END AS after_rally_location_name,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN NULL
      ELSE e.after_rally_location_lat
    END AS after_rally_location_lat,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN NULL
      ELSE e.after_rally_location_lng
    END AS after_rally_location_lng,
    e.after_rally_stealth,
    -- Hide the invite list entirely from anyone not on it
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN '{}'::uuid[]
      ELSE e.after_rally_invited_ids
    END AS after_rally_invited_ids
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_safe(uuid) TO authenticated;

-- 3. Multi-event safe reader for the upcoming/live feed. Same masking logic.
CREATE OR REPLACE FUNCTION public.list_events_safe()
RETURNS SETOF public.events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_profile_id uuid;
BEGIN
  SELECT id INTO v_viewer_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  SELECT
    e.id,
    e.creator_id,
    e.title,
    e.description,
    e.event_type,
    e.location_name,
    e.location_lat,
    e.location_lng,
    e.start_time,
    e.end_time,
    e.image_url,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND e.status = 'after_rally'
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN 'completed'
      ELSE e.status
    END AS status,
    e.max_attendees,
    e.invite_code,
    e.is_barhop,
    e.created_at,
    e.updated_at,
    e.is_quick_rally,
    e.cover_charge,
    e.split_check,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN NULL
      ELSE e.after_rally_location_name
    END AS after_rally_location_name,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN NULL
      ELSE e.after_rally_location_lat
    END AS after_rally_location_lat,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN NULL
      ELSE e.after_rally_location_lng
    END AS after_rally_location_lng,
    e.after_rally_stealth,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN '{}'::uuid[]
      ELSE e.after_rally_invited_ids
    END AS after_rally_invited_ids
  FROM public.events e;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_events_safe() TO authenticated;