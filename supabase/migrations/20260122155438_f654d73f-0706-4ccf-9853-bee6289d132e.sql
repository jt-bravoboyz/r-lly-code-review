-- Fix search_path on all badge system functions for security

CREATE OR REPLACE FUNCTION public.rly_get_tier_for_points(p_points INTEGER)
RETURNS TEXT LANGUAGE SQL STABLE 
SET search_path = public
AS $$
  SELECT tier_key FROM public.rly_badge_tiers
  WHERE p_points >= min_points
    AND (max_points IS NULL OR p_points <= max_points)
  ORDER BY sort_order DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.rly_get_next_tier(p_current_tier_key TEXT)
RETURNS TABLE(tier_key TEXT, tier_name TEXT, min_points INTEGER) 
LANGUAGE SQL STABLE 
SET search_path = public
AS $$
  SELECT t.tier_key, t.tier_name, t.min_points
  FROM public.rly_badge_tiers t
  WHERE t.sort_order > (
    SELECT sort_order FROM public.rly_badge_tiers WHERE tier_key = p_current_tier_key
  )
  ORDER BY t.sort_order ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.rly_get_user_id_from_profile(p_profile_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE id = p_profile_id
$$;

CREATE OR REPLACE FUNCTION public.rly_check_daily_cap(p_user_id UUID, p_event_type TEXT)
RETURNS BOOLEAN LANGUAGE PLPGSQL STABLE 
SET search_path = public
AS $$
DECLARE
  v_cap INTEGER;
  v_today_count INTEGER;
BEGIN
  SELECT daily_cap INTO v_cap FROM public.rly_point_rules WHERE event_type = p_event_type;
  
  IF v_cap IS NULL THEN
    RETURN TRUE;
  END IF;
  
  SELECT COUNT(*) INTO v_today_count
  FROM public.rly_points_ledger
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND created_date = CURRENT_DATE;
  
  RETURN v_today_count < v_cap;
END;
$$;

CREATE OR REPLACE FUNCTION public.rly_update_activity_badges(p_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  b RECORD;
  v_count INTEGER;
BEGIN
  FOR b IN SELECT badge_key, requirement_event_type, requirement_count FROM public.rly_activity_badges
  LOOP
    SELECT COUNT(*) INTO v_count
    FROM public.rly_points_ledger
    WHERE user_id = p_user_id
      AND event_type = b.requirement_event_type
      AND points > 0;
    
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

CREATE OR REPLACE FUNCTION public.rly_recalc_user_badge(p_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_new_tier TEXT;
  v_old_tier TEXT;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total
  FROM public.rly_points_ledger
  WHERE user_id = p_user_id;
  
  v_new_tier := public.rly_get_tier_for_points(v_total);
  
  SELECT current_tier_key INTO v_old_tier
  FROM public.rly_user_badge_state
  WHERE user_id = p_user_id;
  
  INSERT INTO public.rly_user_badge_state (user_id, total_points, current_tier_key, last_tier_key, updated_at)
  VALUES (p_user_id, v_total, v_new_tier, v_old_tier, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    last_tier_key = rly_user_badge_state.current_tier_key,
    current_tier_key = EXCLUDED.current_tier_key,
    updated_at = now();
  
  IF v_old_tier IS DISTINCT FROM v_new_tier AND v_new_tier IS NOT NULL THEN
    INSERT INTO public.rly_tier_history (user_id, from_tier_key, to_tier_key, total_points)
    VALUES (p_user_id, v_old_tier, v_new_tier, v_total);
  END IF;
  
  PERFORM public.rly_update_activity_badges(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rly_award_points(
  p_user_id UUID,
  p_event_type TEXT,
  p_source_id UUID DEFAULT NULL
)
RETURNS public.rly_points_ledger
LANGUAGE PLPGSQL SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_row public.rly_points_ledger;
BEGIN
  SELECT points INTO v_points
  FROM public.rly_point_rules
  WHERE event_type = p_event_type AND is_active = TRUE;
  
  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive event_type: %', p_event_type;
  END IF;
  
  IF v_points > 0 AND NOT public.rly_check_daily_cap(p_user_id, p_event_type) THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.rly_points_ledger (user_id, event_type, points, source_id, created_date)
  VALUES (p_user_id, p_event_type, v_points, p_source_id, CURRENT_DATE)
  ON CONFLICT (user_id, event_type, source_id) DO NOTHING
  RETURNING * INTO v_row;
  
  IF v_row.id IS NOT NULL THEN
    PERFORM public.rly_recalc_user_badge(p_user_id);
  END IF;
  
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.rly_award_points_by_profile(
  p_profile_id UUID,
  p_event_type TEXT,
  p_source_id UUID DEFAULT NULL
)
RETURNS public.rly_points_ledger
LANGUAGE PLPGSQL SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.profiles WHERE id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;
  
  RETURN public.rly_award_points(v_user_id, p_event_type, p_source_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rly_mark_tier_seen(p_user_id UUID, p_history_id BIGINT)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER 
SET search_path = public
AS $$
  UPDATE public.rly_user_badge_state
  SET last_seen_tier_history_id = p_history_id
  WHERE user_id = p_user_id;
$$;