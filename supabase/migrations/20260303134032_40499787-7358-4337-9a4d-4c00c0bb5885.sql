
CREATE OR REPLACE VIEW public.analytics_funnel_summary
WITH (security_invoker = true)
AS
SELECT
  date_trunc('day', created_at) AS day,
  event_name,
  count(*) AS event_count,
  count(DISTINCT user_id) AS unique_users
FROM public.analytics_events
GROUP BY date_trunc('day', created_at), event_name
ORDER BY day DESC, event_name;
