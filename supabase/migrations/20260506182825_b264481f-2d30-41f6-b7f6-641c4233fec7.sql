
-- Add song_recs_enabled column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS song_recs_enabled boolean NOT NULL DEFAULT false;

-- Recreate get_event_safe and list_events_safe to include song_recs_enabled (must include dress_code as well)
CREATE OR REPLACE FUNCTION public.get_event_safe(p_event_id uuid)
RETURNS SETOF public.events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    e.dress_code,
    e.song_recs_enabled
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_events_safe()
RETURNS SETOF public.events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    e.dress_code,
    e.song_recs_enabled
  FROM public.events e;
END;
$function$;

-- Create song_recs table
CREATE TABLE IF NOT EXISTS public.song_recs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_name text NOT NULL CHECK (char_length(song_name) BETWEEN 1 AND 100),
  artist text NOT NULL CHECK (char_length(artist) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS song_recs_event_idx ON public.song_recs(event_id, created_at DESC);

ALTER TABLE public.song_recs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view song recs"
  ON public.song_recs FOR SELECT
  TO authenticated
  USING (public.is_event_member(event_id));

CREATE POLICY "Event members can add own song recs"
  ON public.song_recs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_event_member(event_id)
    AND profile_id = public.current_profile_id()
  );

CREATE POLICY "Users can delete own song recs"
  ON public.song_recs FOR DELETE
  TO authenticated
  USING (profile_id = public.current_profile_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.song_recs;
