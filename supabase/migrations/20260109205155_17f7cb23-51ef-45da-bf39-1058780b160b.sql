-- Fix the SECURITY DEFINER view issue by dropping it and using a SECURITY INVOKER view
DROP VIEW IF EXISTS public.public_profiles;

-- Create view with SECURITY INVOKER (the default, but being explicit)
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