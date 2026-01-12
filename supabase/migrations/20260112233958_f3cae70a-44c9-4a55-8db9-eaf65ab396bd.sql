-- Fix security linter warnings: Set search_path on trigger functions

-- Fix create_event_chat_on_event_create function
CREATE OR REPLACE FUNCTION public.create_event_chat_on_event_create()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chats (event_id, is_group, name)
  VALUES (NEW.id, true, NEW.title)
  ON CONFLICT (event_id) WHERE squad_id IS NULL DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix sync_chat_participants_on_attendee_change function
CREATE OR REPLACE FUNCTION public.sync_chat_participants_on_attendee_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  SELECT id INTO v_chat_id FROM public.chats 
  WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) 
  AND squad_id IS NULL
  LIMIT 1;
  
  IF v_chat_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chat_participants (chat_id, profile_id)
    VALUES (v_chat_id, NEW.profile_id)
    ON CONFLICT (chat_id, profile_id) DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.chat_participants 
    WHERE chat_id = v_chat_id AND profile_id = OLD.profile_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix views to use SECURITY INVOKER (not DEFINER)
-- The event_safety_summary view should use INVOKER to respect RLS
DROP VIEW IF EXISTS public.event_safety_summary;
CREATE VIEW public.event_safety_summary 
WITH (security_invoker = true)
AS
SELECT 
  event_id,
  COUNT(*) as total_attendees,
  COUNT(*) FILTER (
    WHERE going_home_at IS NOT NULL 
    AND arrived_safely = false 
    AND dd_dropoff_confirmed_at IS NULL
  ) as participating_count,
  COUNT(*) FILTER (
    WHERE arrived_safely = true OR dd_dropoff_confirmed_at IS NOT NULL
  ) as arrived_safely_count,
  COUNT(*) FILTER (
    WHERE not_participating_rally_home_confirmed = true 
    AND going_home_at IS NULL
  ) as not_participating_count,
  COUNT(*) FILTER (
    WHERE going_home_at IS NULL 
    AND not_participating_rally_home_confirmed IS NULL
  ) as undecided_count,
  COUNT(*) FILTER (WHERE is_dd = true) as dd_count,
  COUNT(*) FILTER (
    WHERE is_dd = true AND arrived_safely = false
  ) as dd_pending_arrival_count,
  public.is_event_safety_complete(event_id) as safety_complete
FROM public.event_attendees
GROUP BY event_id;

-- Fix safe_event_attendees view to use SECURITY INVOKER
DROP VIEW IF EXISTS public.safe_event_attendees;
CREATE VIEW public.safe_event_attendees 
WITH (security_invoker = true)
AS
SELECT 
  id,
  event_id,
  profile_id,
  status,
  share_location,
  CASE WHEN share_location = true THEN current_lat ELSE NULL END as current_lat,
  CASE WHEN share_location = true THEN current_lng ELSE NULL END as current_lng,
  CASE WHEN share_location = true THEN last_location_update ELSE NULL END as last_location_update,
  joined_at,
  going_home_at,
  CASE 
    WHEN destination_visibility = 'all' THEN destination_name
    ELSE NULL 
  END as destination_name,
  destination_visibility,
  arrived_at,
  arrived_safely,
  is_dd,
  not_participating_rally_home_confirmed,
  dd_dropoff_confirmed_at,
  dd_dropoff_confirmed_by
FROM public.event_attendees;