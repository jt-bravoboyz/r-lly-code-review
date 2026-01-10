-- Create rate_limits table to track creation attempts
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own rate limit entries
CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits FOR SELECT
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- System manages rate limits via trigger (no direct user insert)
CREATE POLICY "System manages rate limits"
  ON public.rate_limits FOR INSERT
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(profile_id, action_type, created_at DESC);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_profile_id uuid,
  p_action_type text,
  p_max_count integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Count recent actions within the time window
  SELECT COUNT(*) INTO current_count
  FROM rate_limits
  WHERE profile_id = p_profile_id
    AND action_type = p_action_type
    AND created_at > (now() - (p_window_minutes || ' minutes')::interval);
  
  RETURN current_count < p_max_count;
END;
$$;

-- Create function to record rate limit entry
CREATE OR REPLACE FUNCTION public.record_rate_limit(
  p_profile_id uuid,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO rate_limits (profile_id, action_type)
  VALUES (p_profile_id, p_action_type);
  
  -- Clean up old entries (older than 24 hours) to prevent table bloat
  DELETE FROM rate_limits
  WHERE created_at < (now() - interval '24 hours');
END;
$$;

-- Create trigger function to enforce rate limiting on squad creation
CREATE OR REPLACE FUNCTION public.enforce_squad_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow max 5 squad creations per 60 minutes per user
  IF NOT check_rate_limit(NEW.owner_id, 'squad_create', 5, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded. You can create up to 5 squads per hour.';
  END IF;
  
  -- Record this creation attempt
  PERFORM record_rate_limit(NEW.owner_id, 'squad_create');
  
  RETURN NEW;
END;
$$;

-- Create trigger on squads table
DROP TRIGGER IF EXISTS squad_rate_limit_trigger ON public.squads;
CREATE TRIGGER squad_rate_limit_trigger
  BEFORE INSERT ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_squad_rate_limit();

-- Add comment explaining the rate limiting
COMMENT ON TABLE public.rate_limits IS 'Tracks rate-limited actions to prevent abuse. Entries auto-expire after 24 hours.';
COMMENT ON FUNCTION public.enforce_squad_rate_limit() IS 'Enforces rate limit of 5 squad creations per hour per user to prevent invite harvesting.';