
-- 1. Drop the overly broad connected-user SELECT policy
DROP POLICY IF EXISTS "Connected users can view profile rows" ON public.profiles;

-- 2. Recreate safe_profiles view WITHOUT security_invoker so it bypasses table RLS
DROP VIEW IF EXISTS public.safe_profiles CASCADE;
CREATE VIEW public.safe_profiles AS
  SELECT id, user_id, display_name, avatar_url, bio, badges, reward_points, created_at
  FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.safe_profiles TO authenticated;
GRANT SELECT ON public.safe_profiles TO anon;

-- 3. Create get_referral_count RPC
CREATE OR REPLACE FUNCTION public.get_referral_count(p_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM profiles WHERE referred_by = p_profile_id;
$$;

-- 4. Switch chat-images bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';
