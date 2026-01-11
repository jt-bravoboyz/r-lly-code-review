-- Fix: Add is_dd column to safe_event_attendees view
-- Must drop and recreate since we're adding a column in a different position
DROP VIEW IF EXISTS public.safe_event_attendees;

CREATE VIEW public.safe_event_attendees AS
SELECT 
    id,
    event_id,
    profile_id,
    status,
    joined_at,
    arrived_at,
    arrived_home,
    going_home_at,
    share_location,
    is_dd,
    CASE
        WHEN (share_location = true) THEN current_lat
        ELSE NULL::double precision
    END AS current_lat,
    CASE
        WHEN (share_location = true) THEN current_lng
        ELSE NULL::double precision
    END AS current_lng,
    CASE
        WHEN (share_location = true) THEN last_location_update
        ELSE NULL::timestamp with time zone
    END AS last_location_update,
    destination_visibility,
    CASE
        WHEN (destination_visibility = 'all'::text) THEN destination_name
        WHEN ((destination_visibility = 'selected'::text) AND (EXISTS ( SELECT 1
           FROM profiles p
          WHERE ((p.user_id = auth.uid()) AND (p.id = ANY (ea.destination_shared_with)))))) THEN destination_name
        WHEN (EXISTS ( SELECT 1
           FROM profiles p
          WHERE ((p.user_id = auth.uid()) AND (p.id = ea.profile_id)))) THEN destination_name
        ELSE NULL::text
    END AS destination_name
FROM event_attendees ea;