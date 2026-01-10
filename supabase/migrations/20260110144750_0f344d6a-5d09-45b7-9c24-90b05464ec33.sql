-- Enable pgcrypto extension for secure random generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to generate secure invite codes using plpgsql (deferred execution)
CREATE OR REPLACE FUNCTION public.generate_secure_invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  raw_bytes bytea;
  encoded text;
BEGIN
  -- Generate 12 random bytes and encode as base64
  raw_bytes := gen_random_bytes(12);
  encoded := encode(raw_bytes, 'base64');
  -- Replace non-alphanumeric characters and uppercase
  RETURN upper(replace(replace(encoded, '+', 'X'), '/', 'Y'));
END;
$$;

-- Update the default to use the secure function
ALTER TABLE public.squad_invites 
  ALTER COLUMN invite_code SET DEFAULT public.generate_secure_invite_code();

-- Recreate safe_profiles view that only exposes non-sensitive public data
-- This view excludes phone, home_address, and location data
DROP VIEW IF EXISTS public.safe_profiles;
CREATE VIEW public.safe_profiles WITH (security_invoker = true) AS
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

-- Recreate public_profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
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

-- Add comments explaining the security model
COMMENT ON VIEW public.safe_profiles IS 'View exposing only non-sensitive profile data for connected users. Excludes phone, home_address, and location data.';
COMMENT ON VIEW public.public_profiles IS 'Public view of profile data. Only exposes display information, no PII.';
COMMENT ON TABLE public.profiles IS 'Contains sensitive user data. Direct access restricted. Use safe_profiles for non-owner access.';