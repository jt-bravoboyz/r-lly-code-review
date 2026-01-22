-- =============================================
-- R@LLY BADGE & TIER SYSTEM
-- =============================================

-- 1. Tier Definitions Table
CREATE TABLE public.rly_badge_tiers (
  tier_key TEXT PRIMARY KEY,
  tier_name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  sort_order INTEGER NOT NULL,
  icon_path TEXT,
  gradient TEXT,
  accent_color TEXT,
  congrats_title TEXT NOT NULL,
  congrats_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Point Rules Table (with daily caps)
CREATE TABLE public.rly_point_rules (
  event_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_cap INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Points Ledger (immutable log)
CREATE TABLE public.rly_points_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL REFERENCES rly_point_rules(event_type),
  points INTEGER NOT NULL,
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT rly_points_ledger_unique UNIQUE (user_id, event_type, source_id)
);
CREATE INDEX rly_points_ledger_user_created_idx ON rly_points_ledger(user_id, created_at DESC);
CREATE INDEX rly_points_ledger_user_date_idx ON rly_points_ledger(user_id, event_type, created_date);

-- 4. User Badge State (current tier + tier-up tracking)
CREATE TABLE public.rly_user_badge_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_tier_key TEXT REFERENCES rly_badge_tiers(tier_key),
  last_tier_key TEXT REFERENCES rly_badge_tiers(tier_key),
  last_seen_tier_history_id BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tier History (for realtime tier-up detection)
CREATE TABLE public.rly_tier_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_tier_key TEXT REFERENCES rly_badge_tiers(tier_key),
  to_tier_key TEXT REFERENCES rly_badge_tiers(tier_key),
  total_points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rly_tier_history_user_created_idx ON rly_tier_history(user_id, created_at DESC);

-- 6. Activity Badge Definitions
CREATE TABLE public.rly_activity_badges (
  badge_key TEXT PRIMARY KEY,
  badge_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_path TEXT,
  icon_svg TEXT,
  requirement_event_type TEXT NOT NULL,
  requirement_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. User Activity Badge Progress
CREATE TABLE public.rly_user_activity_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL REFERENCES rly_activity_badges(badge_key) ON DELETE CASCADE,
  progress_count INTEGER NOT NULL DEFAULT 0,
  earned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_key)
);
CREATE INDEX rly_user_activity_badges_user_idx ON rly_user_activity_badges(user_id);

-- Enable realtime for tier history
ALTER PUBLICATION supabase_realtime ADD TABLE public.rly_tier_history;

-- =============================================
-- SEED DATA
-- =============================================

-- Tier Definitions (11 tiers)
INSERT INTO public.rly_badge_tiers (tier_key, tier_name, min_points, max_points, sort_order, gradient, accent_color, congrats_title, congrats_body) VALUES
  ('bronze', 'Bronze', 50, 149, 1, 'linear-gradient(135deg, #CD7F32, #8B4513)', '#CD7F32', 'Ready. Set. Bronze.', 'Your first rank is live. Join, host, drive, build squads.'),
  ('silver', 'Silver', 150, 299, 2, 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', '#C0C0C0', 'Silver secured.', 'You keep plans moving. Pull your people in.'),
  ('gold', 'Gold', 300, 499, 3, 'linear-gradient(135deg, #FFD700, #FFA500)', '#FFD700', 'Gold status unlocked.', 'Your R@lly record looks strong. Keep stacking wins.'),
  ('emerald', 'Emerald', 500, 799, 4, 'linear-gradient(135deg, #50C878, #228B22)', '#50C878', 'Emerald level.', 'Cleaner moves, faster linkups. Keep the momentum.'),
  ('sapphire', 'Sapphire', 800, 1199, 5, 'linear-gradient(135deg, #0F52BA, #082567)', '#0F52BA', 'Sapphire tier.', 'You show up, you lead, you deliver.'),
  ('ruby', 'Ruby', 1200, 1699, 6, 'linear-gradient(135deg, #E0115F, #9B111E)', '#E0115F', 'Ruby rank.', 'You set the tone. Your squad follows.'),
  ('amethyst', 'Amethyst', 1700, 2399, 7, 'linear-gradient(135deg, #9966CC, #6B238E)', '#9966CC', 'Amethyst tier.', 'Consistency counts. You keep the group active.'),
  ('diamond', 'Diamond', 2400, 3299, 8, 'linear-gradient(135deg, #B9F2FF, #7DF9FF)', '#B9F2FF', 'Diamond unlocked.', 'Strong invites. Strong follow-through.'),
  ('pink_diamond', 'Pink Diamond', 3300, 4499, 9, 'linear-gradient(135deg, #FFB6C1, #FF69B4)', '#FFB6C1', 'Pink Diamond rank.', 'Top-tier rhythm. You keep the night moving.'),
  ('galaxy_opal', 'Galaxy Opal', 4500, 5999, 10, 'linear-gradient(135deg, #FF6B35, #9966CC, #0F52BA)', '#FF6B35', 'Galaxy Opal achieved.', 'You set the pace. Others match it.'),
  ('dark_matter', 'Dark Matter', 6000, NULL, 11, 'linear-gradient(135deg, #1a1a2e, #16213e, #0f0f23)', '#1a1a2e', 'Dark Matter.', 'Elite R@lly status. You are the standard.');

-- Point Rules (6 awards + 6 reversals + safe arrival)
INSERT INTO public.rly_point_rules (event_type, points, description, daily_cap) VALUES
  ('join_event', 5, 'Joined a R@lly', 5),
  ('drive_event', 15, 'Drove for a R@lly', 3),
  ('create_event', 25, 'Created a R@lly', 2),
  ('invite_friend', 25, 'Recruit joined their first R@lly', 3),
  ('join_squad', 10, 'Joined a squad', 3),
  ('create_squad', 30, 'Created a squad', 1),
  ('safe_arrival', 5, 'Marked safe arrival', NULL),
  ('reverse_join_event', -5, 'Left event before start', NULL),
  ('reverse_drive_event', -15, 'Ride not completed', NULL),
  ('reverse_create_event', -25, 'Event canceled before start', NULL),
  ('reverse_invite_friend', -25, 'Invite invalidated', NULL),
  ('reverse_join_squad', -10, 'Left squad shortly after joining', NULL),
  ('reverse_create_squad', -30, 'Squad deleted shortly after creation', NULL);

-- Activity Badges (6 army-themed)
INSERT INTO public.rly_activity_badges (badge_key, badge_name, description, requirement_event_type, requirement_count, icon_svg) VALUES
  ('rally_commander', 'Rally Commander', 'Lead 3 R@llys', 'create_event', 3, 
   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L9 9H2L7.5 13.5L5.5 21L12 16.5L18.5 21L16.5 13.5L22 9H15L12 2Z" fill="currentColor"/><path d="M8 4L10 6H14L16 4L14 5H10L8 4Z" fill="currentColor" opacity="0.7"/></svg>'),
  ('convoy_captain', 'Convoy Captain', 'Drive 3 R@llys', 'drive_event', 3,
   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 5V9M12 15V19M5 12H9M15 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 20L12 17L17 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'),
  ('active_duty', 'Active Duty', 'Join 10 R@llys', 'join_event', 10,
   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6V11C4 16.5 7.8 21.7 12 23C16.2 21.7 20 16.5 20 11V6L12 2Z" fill="currentColor"/><path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
  ('enlistment_officer', 'Enlistment Officer', 'Bring in 3 recruits', 'invite_friend', 3,
   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10V14L7 16V8L3 10Z" fill="currentColor"/><path d="M7 8L19 4V20L7 16V8Z" fill="currentColor"/><circle cx="21" cy="6" r="1.5" fill="currentColor"/><circle cx="22" cy="12" r="1" fill="currentColor"/><circle cx="21" cy="18" r="1.5" fill="currentColor"/></svg>'),
  ('squad_commander', 'Squad Commander', 'Form 1 squad', 'create_squad', 1,
   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 4L13.8 9.2H19.2L14.7 12.4L16.5 17.6L12 14.4L7.5 17.6L9.3 12.4L4.8 9.2H10.2L12 4Z" fill="currentColor"/></svg>'),
  ('enlisted', 'Enlisted', 'Join 1 squad', 'join_squad', 1,
   '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="3" width="14" height="18" rx="2" fill="currentColor"/><circle cx="12" cy="2" r="1.5" stroke="currentColor" fill="none"/><line x1="8" y1="10" x2="16" y2="10" stroke="white" stroke-width="1.5"/><line x1="8" y1="13" x2="14" y2="13" stroke="white" stroke-width="1.5"/><line x1="8" y1="16" x2="12" y2="16" stroke="white" stroke-width="1.5"/></svg>');

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Get tier for a given point total
CREATE OR REPLACE FUNCTION public.rly_get_tier_for_points(p_points INTEGER)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT tier_key FROM public.rly_badge_tiers
  WHERE p_points >= min_points
    AND (max_points IS NULL OR p_points <= max_points)
  ORDER BY sort_order DESC
  LIMIT 1
$$;

-- Get next tier data
CREATE OR REPLACE FUNCTION public.rly_get_next_tier(p_current_tier_key TEXT)
RETURNS TABLE(tier_key TEXT, tier_name TEXT, min_points INTEGER) 
LANGUAGE SQL STABLE AS $$
  SELECT t.tier_key, t.tier_name, t.min_points
  FROM public.rly_badge_tiers t
  WHERE t.sort_order > (
    SELECT sort_order FROM public.rly_badge_tiers WHERE tier_key = p_current_tier_key
  )
  ORDER BY t.sort_order ASC
  LIMIT 1
$$;

-- Get user_id from profile_id
CREATE OR REPLACE FUNCTION public.rly_get_user_id_from_profile(p_profile_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT user_id FROM public.profiles WHERE id = p_profile_id
$$;

-- Check daily cap
CREATE OR REPLACE FUNCTION public.rly_check_daily_cap(p_user_id UUID, p_event_type TEXT)
RETURNS BOOLEAN LANGUAGE PLPGSQL STABLE AS $$
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

-- Update activity badges progress
CREATE OR REPLACE FUNCTION public.rly_update_activity_badges(p_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER AS $$
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

-- Recalculate user badge state
CREATE OR REPLACE FUNCTION public.rly_recalc_user_badge(p_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER AS $$
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

-- Main API: Award points (with cap check)
CREATE OR REPLACE FUNCTION public.rly_award_points(
  p_user_id UUID,
  p_event_type TEXT,
  p_source_id UUID DEFAULT NULL
)
RETURNS public.rly_points_ledger
LANGUAGE PLPGSQL SECURITY DEFINER AS $$
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

-- Wrapper: Award points by profile_id
CREATE OR REPLACE FUNCTION public.rly_award_points_by_profile(
  p_profile_id UUID,
  p_event_type TEXT,
  p_source_id UUID DEFAULT NULL
)
RETURNS public.rly_points_ledger
LANGUAGE PLPGSQL SECURITY DEFINER AS $$
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

-- Mark tier as seen (for modal deduplication)
CREATE OR REPLACE FUNCTION public.rly_mark_tier_seen(p_user_id UUID, p_history_id BIGINT)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.rly_user_badge_state
  SET last_seen_tier_history_id = p_history_id
  WHERE user_id = p_user_id;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.rly_badge_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rly_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rly_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rly_user_badge_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rly_tier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rly_activity_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rly_user_activity_badges ENABLE ROW LEVEL SECURITY;

-- Public read for definitions
CREATE POLICY "Anyone can read tier definitions" ON public.rly_badge_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read point rules" ON public.rly_point_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read activity badges" ON public.rly_activity_badges FOR SELECT TO authenticated USING (true);

-- Read own data only
CREATE POLICY "Users can read own ledger" ON public.rly_points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read own badge state" ON public.rly_user_badge_state FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read own tier history" ON public.rly_tier_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read own activity badges" ON public.rly_user_activity_badges FOR SELECT TO authenticated USING (user_id = auth.uid());