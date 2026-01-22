-- Fix is_connected_to_profile to include squad owners
-- Currently only checks squad_members, but owners are not in squad_members table

CREATE OR REPLACE FUNCTION public.is_connected_to_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
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
  
  -- Connected through squads (both in same squad - either as member or owner)
  -- Check if caller is in a squad where target is also a member OR owner
  IF EXISTS (
    SELECT 1 FROM (
      -- Get all squads caller is part of (as member or owner)
      SELECT squad_id FROM squad_members WHERE profile_id = caller_profile_id
      UNION
      SELECT id AS squad_id FROM squads WHERE owner_id = caller_profile_id
    ) caller_squads
    WHERE caller_squads.squad_id IN (
      -- Check if target is in any of these squads (as member or owner)
      SELECT squad_id FROM squad_members WHERE profile_id = target_profile_id
      UNION
      SELECT id AS squad_id FROM squads WHERE owner_id = target_profile_id
    )
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;