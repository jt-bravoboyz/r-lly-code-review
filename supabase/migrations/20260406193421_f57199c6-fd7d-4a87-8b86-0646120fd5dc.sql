CREATE OR REPLACE FUNCTION public.rly_update_activity_badges(p_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  b RECORD;
  v_count INTEGER;
  v_profile_id UUID;
BEGIN
  -- Resolve profile_id from user_id
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id;

  FOR b IN SELECT badge_key, requirement_event_type, requirement_count FROM public.rly_activity_badges
  LOOP
    -- Count from source tables for badges that aren't reliably tracked in the ledger
    IF b.requirement_event_type = 'join_squad' THEN
      SELECT COUNT(*) INTO v_count FROM public.squad_members WHERE profile_id = v_profile_id;
    ELSIF b.requirement_event_type = 'create_squad' THEN
      SELECT COUNT(*) INTO v_count FROM public.squads WHERE owner_id = v_profile_id;
    ELSIF b.requirement_event_type = 'invite_friend' THEN
      SELECT COUNT(*) INTO v_count FROM public.profiles WHERE referred_by = v_profile_id;
    ELSIF b.requirement_event_type = 'drive_event' THEN
      SELECT COUNT(DISTINCT r.event_id) INTO v_count 
      FROM public.rides r 
      WHERE r.driver_id = v_profile_id AND r.event_id IS NOT NULL;
    ELSE
      -- Default: count from points ledger
      SELECT COUNT(*) INTO v_count
      FROM public.rly_points_ledger
      WHERE user_id = p_user_id
        AND event_type = b.requirement_event_type
        AND points > 0;
    END IF;
    
    INSERT INTO public.rly_user_activity_badges (user_id, badge_key, progress_count, earned_at, updated_at)
    VALUES (
      p_user_id,
      b.badge_key,
      v_count,
      CASE WHEN v_count >= b.requirement_count THEN now() ELSE NULL END,
      now()
    )
    ON CONFLICT (user_id, badge_key) DO UPDATE SET
      progress_count = EXCLUDED.progress_count,
      earned_at = CASE 
        WHEN rly_user_activity_badges.earned_at IS NOT NULL THEN rly_user_activity_badges.earned_at
        WHEN EXCLUDED.progress_count >= b.requirement_count THEN now()
        ELSE NULL
      END,
      updated_at = now();
  END LOOP;
END;
$$;

-- Recalculate all existing users' activity badges from source tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.rly_user_badge_state
  LOOP
    PERFORM public.rly_update_activity_badges(r.user_id);
  END LOOP;
END;
$$;