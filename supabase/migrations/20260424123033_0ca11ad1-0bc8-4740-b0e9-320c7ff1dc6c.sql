ALTER VIEW IF EXISTS public.analytics_funnel_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.event_safety_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.public_profiles SET (security_invoker = true);
ALTER VIEW IF EXISTS public.safe_event_attendees SET (security_invoker = true);
ALTER VIEW IF EXISTS public.safe_profiles SET (security_invoker = true);
ALTER VIEW IF EXISTS public.safe_profiles_with_connection SET (security_invoker = true);