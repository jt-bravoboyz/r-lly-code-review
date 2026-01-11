-- Fix: Remove SECURITY DEFINER view by using SECURITY INVOKER explicitly
-- The view should run with the permissions of the querying user, not the creator

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.safe_profiles_with_connection;

-- Recreate as a simple select without the function call in WHERE
-- Instead, let the underlying RLS on profiles table handle access control
CREATE VIEW public.safe_profiles_with_connection 
WITH (security_invoker = true)
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
  public.get_connection_type(p.id) as connection_type
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.safe_profiles_with_connection TO authenticated;