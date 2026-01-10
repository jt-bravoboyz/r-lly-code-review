-- ============================================
-- FIX WARNING-LEVEL SECURITY ISSUES
-- ============================================

-- 1. Add NULL validation to is_connected_to_profile function
-- This function uses SECURITY DEFINER - add defensive validation
CREATE OR REPLACE FUNCTION public.is_connected_to_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_profile_id uuid;
BEGIN
  -- Validate target_profile_id is not null
  IF target_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
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

-- 2. Restrict chat-images bucket access to authenticated users only
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;

-- Create policy that requires authentication for chat image access
CREATE POLICY "Authenticated users can view chat images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);

-- Note: avatars and event-images remain public as they are meant for public visibility