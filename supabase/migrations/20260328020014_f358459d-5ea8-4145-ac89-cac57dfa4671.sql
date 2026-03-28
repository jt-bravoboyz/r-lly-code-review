-- 1. Secure analytics_funnel_summary view: recreate with security_invoker so it inherits RLS from analytics_events
DROP VIEW IF EXISTS public.analytics_funnel_summary;
CREATE VIEW public.analytics_funnel_summary
WITH (security_invoker = on)
AS
SELECT date_trunc('day'::text, created_at) AS day,
    event_name,
    count(*) AS event_count,
    count(DISTINCT user_id) AS unique_users
   FROM analytics_events
  GROUP BY (date_trunc('day'::text, created_at)), event_name
  ORDER BY (date_trunc('day'::text, created_at)) DESC, event_name;

-- 2. Lock down user_roles: only admins can INSERT, UPDATE, DELETE
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Home address PII isolation: recreate safe_profiles_with_connection without home fields
DROP VIEW IF EXISTS public.safe_profiles_with_connection;
CREATE VIEW public.safe_profiles_with_connection
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.badges,
  p.reward_points,
  p.created_at,
  p.founding_member,
  p.founder_number
FROM profiles p;
