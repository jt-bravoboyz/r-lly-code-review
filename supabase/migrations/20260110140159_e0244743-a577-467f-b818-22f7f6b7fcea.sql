-- Fix the security definer view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  badges,
  reward_points,
  created_at
FROM public.profiles;