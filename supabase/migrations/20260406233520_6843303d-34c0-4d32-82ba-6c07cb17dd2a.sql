
CREATE OR REPLACE FUNCTION public.get_referred_profile_ids(p_referrer_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE referred_by = p_referrer_id;
$$;
