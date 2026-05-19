DROP FUNCTION IF EXISTS public.get_event_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_event_safe(p_event_id uuid)
RETURNS SETOF public.events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
    e.image_url,
    e.start_time,
    e.end_time,
    e.location_name,
    e.location_lat,
    e.location_lng,
    e.is_barhop,
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
    e.dress_code,
    e.song_recs_enabled,
    e.invite_code_expires_at,
    e.invite_code_rotated_at,
    e.flyer_theme,
    e.flyer_custom_image_url,
    e.flyer_og_url,
    e.flyer_og_generated_at
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$$;