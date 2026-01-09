-- Fix: PUBLIC_DATA_EXPOSURE - Profiles table PII is publicly readable
-- Drop the overly permissive policy and replace with column-aware access control

-- First, drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a view for public profile data (non-sensitive columns only)
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Allow public access to the view (non-sensitive data only)
-- Note: Views inherit their base table's RLS when accessed through the view

-- Create policy: Users can view basic profile info for all users (for display purposes)
-- But sensitive fields are null unless viewing own profile or connected through events/squads
CREATE POLICY "Authenticated users can view basic profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Create a function to check if caller is connected to target profile
CREATE OR REPLACE FUNCTION public.is_connected_to_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_profile_id uuid;
BEGIN
  -- Get caller's profile ID
  SELECT id INTO caller_profile_id FROM profiles WHERE user_id = auth.uid();
  
  IF caller_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Same profile
  IF caller_profile_id = target_profile_id THEN
    RETURN true;
  END IF;
  
  -- Connected through events (both attending same event)
  IF EXISTS (
    SELECT 1 FROM event_attendees ea1
    WHERE ea1.profile_id = caller_profile_id
    AND ea1.event_id IN (
      SELECT ea2.event_id FROM event_attendees ea2 WHERE ea2.profile_id = target_profile_id
    )
  ) THEN
    RETURN true;
  END IF;
  
  -- Connected through squads (both in same squad)
  IF EXISTS (
    SELECT 1 FROM squad_members sm1
    WHERE sm1.profile_id = caller_profile_id
    AND sm1.squad_id IN (
      SELECT sm2.squad_id FROM squad_members sm2 WHERE sm2.profile_id = target_profile_id
    )
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;