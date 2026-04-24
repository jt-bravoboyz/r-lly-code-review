CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text, p_limit integer DEFAULT 12)
RETURNS TABLE(id uuid, display_name text, avatar_url text, bio text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.bio
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND NULLIF(trim(p_query), '') IS NOT NULL
    AND p.id <> public.current_profile_id()
    AND p.display_name ILIKE '%' || trim(p_query) || '%'
  ORDER BY p.display_name ASC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 25)
$$;