-- Allow any event member to set a missing thumbnail_url on rally_media (for collaborative backfill)
CREATE OR REPLACE FUNCTION public.set_rally_media_thumbnail(p_media_id uuid, p_thumbnail_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_existing_thumb text;
  v_is_member boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT event_id, thumbnail_url INTO v_event_id, v_existing_thumb
  FROM public.rally_media
  WHERE id = p_media_id;

  IF v_event_id IS NULL THEN
    RETURN false;
  END IF;

  -- Only allow setting when no thumbnail exists yet (don't overwrite real thumbnails)
  IF v_existing_thumb IS NOT NULL AND length(v_existing_thumb) > 0 THEN
    RETURN false;
  END IF;

  -- Caller must be an event member
  v_is_member := public.is_event_member(v_event_id);
  IF NOT v_is_member THEN
    RETURN false;
  END IF;

  UPDATE public.rally_media
  SET thumbnail_url = p_thumbnail_url
  WHERE id = p_media_id
    AND (thumbnail_url IS NULL OR length(thumbnail_url) = 0);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_rally_media_thumbnail(uuid, text) TO authenticated;