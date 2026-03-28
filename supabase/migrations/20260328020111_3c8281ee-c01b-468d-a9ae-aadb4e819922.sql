-- Recreate all insecure views with security_invoker = on

-- 1. safe_profiles
DROP VIEW IF EXISTS public.safe_profiles;
CREATE VIEW public.safe_profiles
WITH (security_invoker = on)
AS
SELECT id, user_id, display_name, avatar_url, bio, badges, reward_points, created_at
FROM profiles;

-- 2. public_profiles
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS
SELECT id, user_id, display_name, avatar_url, bio, badges, reward_points, created_at
FROM profiles;

-- 3. safe_event_attendees
DROP VIEW IF EXISTS public.safe_event_attendees;
CREATE VIEW public.safe_event_attendees
WITH (security_invoker = on)
AS
SELECT id, event_id, profile_id, status, share_location,
    CASE WHEN share_location = true THEN current_lat ELSE NULL::double precision END AS current_lat,
    CASE WHEN share_location = true THEN current_lng ELSE NULL::double precision END AS current_lng,
    CASE WHEN share_location = true THEN last_location_update ELSE NULL::timestamp with time zone END AS last_location_update,
    joined_at, going_home_at,
    CASE WHEN destination_visibility = 'all' THEN destination_name ELSE NULL::text END AS destination_name,
    destination_visibility, arrived_at, arrived_safely, is_dd,
    not_participating_rally_home_confirmed, dd_dropoff_confirmed_at, dd_dropoff_confirmed_by
FROM event_attendees;

-- 4. event_safety_summary
DROP VIEW IF EXISTS public.event_safety_summary;
CREATE VIEW public.event_safety_summary
WITH (security_invoker = on)
AS
SELECT event_id,
    count(*) AS total_attendees,
    count(*) FILTER (WHERE going_home_at IS NOT NULL AND arrived_safely = false AND dd_dropoff_confirmed_at IS NULL) AS participating_count,
    count(*) FILTER (WHERE arrived_safely = true OR dd_dropoff_confirmed_at IS NOT NULL) AS arrived_safely_count,
    count(*) FILTER (WHERE not_participating_rally_home_confirmed = true AND going_home_at IS NULL) AS not_participating_count,
    count(*) FILTER (WHERE going_home_at IS NULL AND not_participating_rally_home_confirmed IS NULL) AS undecided_count,
    count(*) FILTER (WHERE is_dd = true) AS dd_count,
    count(*) FILTER (WHERE is_dd = true AND arrived_safely = false) AS dd_pending_arrival_count,
    is_event_safety_complete(event_id) AS safety_complete
FROM event_attendees
GROUP BY event_id;

-- 5. Also recreate analytics_funnel_summary (already done but scanner may need the view to have security_invoker)
DROP VIEW IF EXISTS public.analytics_funnel_summary;
CREATE VIEW public.analytics_funnel_summary
WITH (security_invoker = on)
AS
SELECT date_trunc('day'::text, created_at) AS day,
    event_name,
    count(*) AS event_count,
    count(DISTINCT user_id) AS unique_users
FROM analytics_events
GROUP BY date_trunc('day'::text, created_at), event_name
ORDER BY date_trunc('day'::text, created_at) DESC, event_name;
