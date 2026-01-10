-- Create a security definer function to allow public access to event preview by invite code
-- This allows unauthenticated users to see basic event info when they have a valid invite code
CREATE OR REPLACE FUNCTION public.get_event_preview_by_invite_code(invite_code_param text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  start_time timestamptz,
  location_name text,
  is_barhop boolean,
  is_quick_rally boolean,
  invite_code text,
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
  WHERE e.invite_code = UPPER(invite_code_param);
END;
$$;