-- ============================================================
-- 1. NOTIFICATION DEDUPLICATION
-- ============================================================
-- Drop notifications with identical (profile_id, type, data->>'dedupe_key')
-- created within the last 60 seconds. Notifications without a dedupe_key
-- pass through unchanged for back-compat.

CREATE OR REPLACE FUNCTION public.dedupe_notifications_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dedupe_key text;
  v_existing_id uuid;
BEGIN
  v_dedupe_key := NEW.data ->> 'dedupe_key';

  -- No dedupe key => allow through
  IF v_dedupe_key IS NULL OR v_dedupe_key = '' THEN
    RETURN NEW;
  END IF;

  -- Check for identical recent notification
  SELECT id INTO v_existing_id
  FROM public.notifications
  WHERE profile_id = NEW.profile_id
    AND type = NEW.type
    AND (data ->> 'dedupe_key') = v_dedupe_key
    AND created_at > now() - interval '60 seconds'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Silently drop the duplicate
    RAISE NOTICE 'Dropped duplicate notification: profile=% type=% key=%',
      NEW.profile_id, NEW.type, v_dedupe_key;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_dedupe ON public.notifications;
CREATE TRIGGER notifications_dedupe
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.dedupe_notifications_before_insert();

CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_lookup
ON public.notifications (profile_id, type, ((data ->> 'dedupe_key')), created_at DESC)
WHERE (data ->> 'dedupe_key') IS NOT NULL;

-- ============================================================
-- 2. AUTO-COMPLETE STALE R@LLIES (8 hours)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_complete_stale_rallies()
RETURNS TABLE(event_id uuid, title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
BEGIN
  FOR v_event IN
    SELECT e.id, e.title, e.creator_id
    FROM public.events e
    WHERE e.status IN ('scheduled', 'live', 'after_rally')
      AND COALESCE(e.end_time, e.start_time) < now() - interval '8 hours'
  LOOP
    -- Mark event completed
    UPDATE public.events
    SET status = 'completed', updated_at = now()
    WHERE id = v_event.id;

    -- End any open rides for this event
    UPDATE public.rides
    SET status = 'ended', updated_at = now()
    WHERE event_id = v_event.id
      AND status NOT IN ('ended', 'canceled', 'completed');

    -- Notify host (deduped via dedupe_key)
    INSERT INTO public.notifications (profile_id, type, title, body, data, read)
    VALUES (
      v_event.creator_id,
      'event_update',
      'R@lly auto-archived',
      '"' || COALESCE(v_event.title, 'Your R@lly') || '" was automatically archived after 8 hours',
      jsonb_build_object(
        'event_id', v_event.id,
        'dedupe_key', 'auto-archive:' || v_event.id::text
      ),
      false
    );

    event_id := v_event.id;
    title := v_event.title;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing job, then schedule fresh
DO $$
BEGIN
  PERFORM cron.unschedule('auto-complete-stale-rallies');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'auto-complete-stale-rallies',
  '*/15 * * * *',
  $$ SELECT public.auto_complete_stale_rallies(); $$
);

-- ============================================================
-- 3. BACKFILL FOUNDER BADGES
-- ============================================================
UPDATE public.profiles
SET badges = ARRAY['founding_member']::text[]
WHERE founding_member = true
  AND (badges IS NULL OR NOT ('founding_member' = ANY(badges)));

UPDATE public.profiles
SET badges = array_append(badges, 'founder_' || founder_number::text)
WHERE founding_member = true
  AND founder_number IS NOT NULL
  AND NOT (('founder_' || founder_number::text) = ANY(COALESCE(badges, ARRAY[]::text[])));

-- ============================================================
-- 4. RECENTLY FRIENDED HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_recently_friended(p_profile_id uuid, p_limit int DEFAULT 8)
RETURNS TABLE(
  profile_id uuid,
  display_name text,
  avatar_url text,
  responded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id AS profile_id,
    sp.display_name,
    sp.avatar_url,
    f.responded_at
  FROM public.friendships f
  JOIN public.safe_profiles sp ON sp.id = CASE
    WHEN f.requester_id = p_profile_id THEN f.recipient_id
    ELSE f.requester_id
  END
  WHERE (f.requester_id = p_profile_id OR f.recipient_id = p_profile_id)
    AND f.status = 'accepted'
  ORDER BY COALESCE(f.responded_at, f.requested_at) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 8), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.get_recently_friended(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_complete_stale_rallies() TO service_role;