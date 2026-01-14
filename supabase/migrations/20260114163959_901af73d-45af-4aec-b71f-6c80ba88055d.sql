-- Drop and recreate the get_event_preview_by_invite_code function
-- The invite_code column is varchar, but return type was text

DROP FUNCTION IF EXISTS public.get_event_preview_by_invite_code(text);

CREATE FUNCTION public.get_event_preview_by_invite_code(invite_code_param text)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  start_time timestamp with time zone, 
  location_name text, 
  is_barhop boolean, 
  is_quick_rally boolean, 
  invite_code character varying, 
  creator_id uuid, 
  creator_display_name text, 
  creator_avatar_url text, 
  attendee_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_time,
    e.location_name,
    e.is_barhop,
    e.is_quick_rally,
    e.invite_code,
    p.id as creator_id,
    p.display_name as creator_display_name,
    p.avatar_url as creator_avatar_url,
    (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id) as attendee_count
  FROM events e
  LEFT JOIN profiles p ON e.creator_id = p.id
  WHERE UPPER(e.invite_code) = UPPER(invite_code_param);
END;
$$;