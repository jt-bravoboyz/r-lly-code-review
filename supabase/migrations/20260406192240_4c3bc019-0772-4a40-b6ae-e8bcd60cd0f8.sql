
CREATE OR REPLACE FUNCTION public.rly_recalc_user_badge(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Sync total points back to profiles.reward_points so legacy hooks stay in sync
  UPDATE public.profiles
  SET reward_points = v_total
  WHERE user_id = p_user_id;
  
  IF v_old_tier IS DISTINCT FROM v_new_tier AND v_new_tier IS NOT NULL THEN
    INSERT INTO public.rly_tier_history (user_id, from_tier_key, to_tier_key, total_points)
    VALUES (p_user_id, v_old_tier, v_new_tier, v_total);
  END IF;
  
  PERFORM public.rly_update_activity_badges(p_user_id);
END;
$function$;

-- Backfill: sync all existing users' reward_points from the ledger
UPDATE public.profiles p
SET reward_points = COALESCE(ledger.total, 0)
FROM (
  SELECT user_id, SUM(points) AS total
  FROM public.rly_points_ledger
  GROUP BY user_id
) ledger
WHERE p.user_id = ledger.user_id
  AND COALESCE(p.reward_points, 0) != COALESCE(ledger.total, 0);
