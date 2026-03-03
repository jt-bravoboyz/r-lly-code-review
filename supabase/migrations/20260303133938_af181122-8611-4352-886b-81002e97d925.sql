
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own analytics"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at);

CREATE OR REPLACE VIEW public.analytics_funnel_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  event_name,
  count(*) AS event_count,
  count(DISTINCT user_id) AS unique_users
FROM public.analytics_events
GROUP BY date_trunc('day', created_at), event_name
ORDER BY day DESC, event_name;
