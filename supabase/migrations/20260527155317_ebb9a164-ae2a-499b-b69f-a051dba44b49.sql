
CREATE OR REPLACE FUNCTION public.create_event(
  p_title text,
  p_description text DEFAULT NULL,
  p_event_type text DEFAULT 'rally',
  p_start_time timestamptz DEFAULT now(),
  p_location_name text DEFAULT NULL,
  p_location_lat double precision DEFAULT NULL,
  p_location_lng double precision DEFAULT NULL,
  p_is_barhop boolean DEFAULT false,
  p_cover_charge numeric DEFAULT 0,
  p_split_check boolean DEFAULT false,
  p_dress_code text DEFAULT NULL,
  p_song_recs_enabled boolean DEFAULT false,
  p_flyer_theme text DEFAULT 'rally_dynamic',
  p_flyer_custom_image_url text DEFAULT NULL,
  p_is_quick_rally boolean DEFAULT false
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_row public.events;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Your profile isn''t ready yet — give it a sec and try again' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.events (
    creator_id, title, description, event_type, start_time,
    location_name, location_lat, location_lng, is_barhop,
    cover_charge, split_check, dress_code, song_recs_enabled,
    flyer_theme, flyer_custom_image_url, is_quick_rally
  ) VALUES (
    v_profile_id, p_title, p_description, COALESCE(p_event_type, 'rally'), p_start_time,
    p_location_name, p_location_lat, p_location_lng, COALESCE(p_is_barhop, false),
    COALESCE(p_cover_charge, 0), COALESCE(p_split_check, false), p_dress_code, COALESCE(p_song_recs_enabled, false),
    COALESCE(p_flyer_theme, 'rally_dynamic'), p_flyer_custom_image_url, COALESCE(p_is_quick_rally, false)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_event(text, text, text, timestamptz, text, double precision, double precision, boolean, numeric, boolean, text, boolean, text, text, boolean) TO authenticated;
