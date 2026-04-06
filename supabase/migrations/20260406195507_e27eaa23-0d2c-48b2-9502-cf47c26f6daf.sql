
-- 1. Create activity badge tiers reference table
CREATE TABLE public.rly_activity_badge_tiers (
  tier_level INTEGER PRIMARY KEY,
  tier_name TEXT NOT NULL,
  multiplier INTEGER NOT NULL,
  bonus_points INTEGER NOT NULL,
  color_hex TEXT NOT NULL
);

INSERT INTO public.rly_activity_badge_tiers (tier_level, tier_name, multiplier, bonus_points, color_hex) VALUES
  (1, 'Bronze', 1, 25, '#CD7F32'),
  (2, 'Silver', 5, 50, '#C0C0C0'),
  (3, 'Gold', 15, 75, '#FFD700'),
  (4, 'Diamond', 50, 100, '#57ADDD'),
  (5, 'Dark Matter', 100, 150, '#FF50B5');

-- 2. Add current_tier_level to user activity badges
ALTER TABLE public.rly_user_activity_badges
  ADD COLUMN IF NOT EXISTS current_tier_level INTEGER DEFAULT 0;

-- 3. Add badge_tier_up point rule
INSERT INTO public.rly_point_rules (event_type, points, description, is_active, daily_cap)
VALUES ('badge_tier_up', 1, 'Bonus points for reaching a new activity badge tier', true, NULL)
ON CONFLICT DO NOTHING;

-- 4. Replace rly_update_activity_badges to support tiered progression
CREATE OR REPLACE FUNCTION public.rly_update_activity_badges(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b RECORD;
  t RECORD;
  v_count INTEGER;
  v_profile_id UUID;
  v_old_tier INTEGER;
  v_new_tier INTEGER;
  v_threshold INTEGER;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id;

  FOR b IN SELECT badge_key, requirement_event_type, requirement_count FROM public.rly_activity_badges
  LOOP
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
      SELECT COUNT(*) INTO v_count
      FROM public.rly_points_ledger
      WHERE user_id = p_user_id
        AND event_type = b.requirement_event_type
        AND points > 0;
    END IF;

    -- Determine highest tier reached
    v_new_tier := 0;
    FOR t IN SELECT tier_level, multiplier FROM public.rly_activity_badge_tiers ORDER BY tier_level ASC
    LOOP
      v_threshold := b.requirement_count * t.multiplier;
      IF v_count >= v_threshold THEN
        v_new_tier := t.tier_level;
      END IF;
    END LOOP;

    -- Get old tier level
    SELECT COALESCE(current_tier_level, 0) INTO v_old_tier
    FROM public.rly_user_activity_badges
    WHERE user_id = p_user_id AND badge_key = b.badge_key;

    IF v_old_tier IS NULL THEN
      v_old_tier := 0;
    END IF;

    -- Upsert badge progress
    INSERT INTO public.rly_user_activity_badges (user_id, badge_key, progress_count, earned_at, current_tier_level, updated_at)
    VALUES (
      p_user_id,
      b.badge_key,
      v_count,
      CASE WHEN v_new_tier >= 1 THEN now() ELSE NULL END,
      v_new_tier,
      now()
    )
    ON CONFLICT (user_id, badge_key) DO UPDATE SET
      progress_count = EXCLUDED.progress_count,
      earned_at = CASE 
        WHEN rly_user_activity_badges.earned_at IS NOT NULL THEN rly_user_activity_badges.earned_at
        WHEN EXCLUDED.progress_count >= b.requirement_count THEN now()
        ELSE NULL
      END,
      current_tier_level = EXCLUDED.current_tier_level,
      updated_at = now();

    -- Award bonus points for each new tier reached
    IF v_new_tier > v_old_tier THEN
      FOR t IN SELECT tier_level, bonus_points FROM public.rly_activity_badge_tiers
               WHERE tier_level > v_old_tier AND tier_level <= v_new_tier
               ORDER BY tier_level ASC
      LOOP
        INSERT INTO public.rly_points_ledger (user_id, event_type, points, source_id, created_date)
        VALUES (p_user_id, 'badge_tier_up', t.bonus_points, NULL, CURRENT_DATE);
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- 5. Backfill: recalc all existing users
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.rly_user_activity_badges
  LOOP
    PERFORM public.rly_update_activity_badges(u.user_id);
  END LOOP;
END;
$$;
