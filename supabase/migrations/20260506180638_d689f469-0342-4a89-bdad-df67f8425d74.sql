-- Add dress_code column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS dress_code text;

-- Recreate get_event_safe to include dress_code (RETURNS SETOF events requires full row shape)
CREATE OR REPLACE FUNCTION public.get_event_safe(p_event_id uuid)
RETURNS SETOF events
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    e.image_url,
    e.start_time,
    e.end_time,
    e.location_name,
    e.location_lat,
    e.location_lng,
    e.is_barhop,
    e.max_attendees,
    e.created_at,
    e.updated_at,
    e.invite_code,
    e.is_quick_rally,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND e.status = 'after_rally'
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN 'completed'
      ELSE e.status
    END AS status,
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
    e.cover_charge,
    e.split_check,
    e.after_rally_stealth,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN '{}'::uuid[]
      ELSE e.after_rally_invited_ids
    END AS after_rally_invited_ids,
    e.dress_code
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$function$;

-- Recreate list_events_safe to include dress_code
CREATE OR REPLACE FUNCTION public.list_events_safe()
RETURNS SETOF events
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    e.image_url,
    e.start_time,
    e.end_time,
    e.location_name,
    e.location_lat,
    e.location_lng,
    e.is_barhop,
    e.max_attendees,
    e.created_at,
    e.updated_at,
    e.invite_code,
    e.is_quick_rally,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND e.status = 'after_rally'
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN 'completed'
      ELSE e.status
    END AS status,
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
    e.cover_charge,
    e.split_check,
    e.after_rally_stealth,
    CASE
      WHEN COALESCE(e.after_rally_stealth, false) = true
       AND NOT public.is_after_rally_invited(e.id, v_viewer_profile_id)
      THEN '{}'::uuid[]
      ELSE e.after_rally_invited_ids
    END AS after_rally_invited_ids,
    e.dress_code
  FROM public.events e;
END;
$function$;