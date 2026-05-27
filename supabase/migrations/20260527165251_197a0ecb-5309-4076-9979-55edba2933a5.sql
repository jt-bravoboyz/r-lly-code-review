
-- ============================================================
-- R@lly Social Blueprint Phase 1: DMs + PYMK
-- ============================================================

-- 1. DM identifier on chats (composite alphabetical profile-id key)
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS dm_key text;

CREATE UNIQUE INDEX IF NOT EXISTS chats_dm_key_unique_idx
  ON public.chats (dm_key)
  WHERE dm_key IS NOT NULL;

-- 2. Per-participant read cursor (cheap DM-style read receipt)
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 3. Allow participants to update their own row (read cursor)
DROP POLICY IF EXISTS "Users can update own chat participant row" ON public.chat_participants;
CREATE POLICY "Users can update own chat participant row"
  ON public.chat_participants
  FOR UPDATE
  TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

-- 4. RLS for DM messages (chat_id belongs to a DM chat AND caller is participant)
DROP POLICY IF EXISTS "DM participants can view dm messages" ON public.messages;
CREATE POLICY "DM participants can view dm messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chats c
      WHERE c.id = messages.chat_id
        AND c.dm_key IS NOT NULL
        AND public.is_chat_member(c.id)
    )
  );

DROP POLICY IF EXISTS "DM participants can send dm messages" ON public.messages;
CREATE POLICY "DM participants can send dm messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1
      FROM public.chats c
      WHERE c.id = messages.chat_id
        AND c.dm_key IS NOT NULL
        AND public.is_chat_member(c.id)
    )
  );

-- 5. RPC: get-or-create a 1:1 DM chat (idempotent on alphabetical pair)
CREATE OR REPLACE FUNCTION public.get_or_create_dm_chat(p_other_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
  v_a uuid;
  v_b uuid;
  v_key text;
  v_chat_id uuid;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_profile_id IS NULL OR p_other_profile_id = v_me THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  IF v_me::text < p_other_profile_id::text THEN
    v_a := v_me; v_b := p_other_profile_id;
  ELSE
    v_a := p_other_profile_id; v_b := v_me;
  END IF;
  v_key := v_a::text || ':' || v_b::text;

  SELECT id INTO v_chat_id FROM public.chats WHERE dm_key = v_key LIMIT 1;
  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  INSERT INTO public.chats (is_group, dm_key)
  VALUES (false, v_key)
  RETURNING id INTO v_chat_id;

  INSERT INTO public.chat_participants (chat_id, profile_id)
  VALUES (v_chat_id, v_a), (v_chat_id, v_b)
  ON CONFLICT DO NOTHING;

  RETURN v_chat_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_chat(uuid) TO authenticated;

-- 6. RPC: list my DM chats with last-message preview + unread count
CREATE OR REPLACE FUNCTION public.list_my_dm_chats()
RETURNS TABLE (
  chat_id uuid,
  other_profile_id uuid,
  other_display_name text,
  other_avatar_url text,
  last_message_text text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_dms AS (
    SELECT c.id AS chat_id, cp_me.read_at
    FROM public.chats c
    JOIN public.chat_participants cp_me
      ON cp_me.chat_id = c.id AND cp_me.profile_id = v_me
    WHERE c.dm_key IS NOT NULL
  ),
  others AS (
    SELECT m.chat_id, cp.profile_id AS other_id, m.read_at
    FROM my_dms m
    JOIN public.chat_participants cp
      ON cp.chat_id = m.chat_id AND cp.profile_id <> v_me
  ),
  last_msg AS (
    SELECT DISTINCT ON (msg.chat_id)
      msg.chat_id, msg.content, msg.created_at
    FROM public.messages msg
    WHERE msg.chat_id IN (SELECT chat_id FROM my_dms)
    ORDER BY msg.chat_id, msg.created_at DESC
  )
  SELECT
    o.chat_id,
    o.other_id,
    sp.display_name,
    sp.avatar_url,
    lm.content,
    lm.created_at,
    COALESCE((
      SELECT COUNT(*)::int FROM public.messages m2
      WHERE m2.chat_id = o.chat_id
        AND m2.sender_id <> v_me
        AND (o.read_at IS NULL OR m2.created_at > o.read_at)
    ), 0) AS unread_count
  FROM others o
  LEFT JOIN public.safe_profiles sp ON sp.id = o.other_id
  LEFT JOIN last_msg lm ON lm.chat_id = o.chat_id
  ORDER BY COALESCE(lm.created_at, 'epoch'::timestamptz) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_dm_chats() TO authenticated;

-- 7. RPC: People You May Know (mutual-friend overlap)
CREATE OR REPLACE FUNCTION public.get_people_you_may_know(p_limit integer DEFAULT 20)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  avatar_url text,
  mutual_count integer,
  mutual_sample_names text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
BEGIN
  SELECT id INTO v_me FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_me IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH my_friends AS (
    SELECT CASE WHEN f.requester_id = v_me THEN f.recipient_id ELSE f.requester_id END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = v_me OR f.recipient_id = v_me)
  ),
  candidates AS (
    SELECT
      CASE WHEN f2.requester_id IN (SELECT friend_id FROM my_friends)
           THEN f2.recipient_id ELSE f2.requester_id END AS candidate_id,
      CASE WHEN f2.requester_id IN (SELECT friend_id FROM my_friends)
           THEN f2.requester_id ELSE f2.recipient_id END AS via_friend_id
    FROM public.friendships f2
    WHERE f2.status = 'accepted'
      AND (
        f2.requester_id IN (SELECT friend_id FROM my_friends)
        OR f2.recipient_id IN (SELECT friend_id FROM my_friends)
      )
  ),
  filtered AS (
    SELECT candidate_id, via_friend_id
    FROM candidates
    WHERE candidate_id <> v_me
      AND candidate_id NOT IN (SELECT friend_id FROM my_friends)
      AND NOT EXISTS (
        SELECT 1 FROM public.friendships f3
        WHERE (f3.requester_id = v_me AND f3.recipient_id = candidates.candidate_id)
           OR (f3.recipient_id = v_me AND f3.requester_id = candidates.candidate_id)
      )
  ),
  aggregated AS (
    SELECT
      candidate_id,
      COUNT(DISTINCT via_friend_id)::int AS mutual_count,
      ARRAY(
        SELECT sp.display_name
        FROM public.safe_profiles sp
        WHERE sp.id IN (
          SELECT DISTINCT via_friend_id FROM filtered f4 WHERE f4.candidate_id = fx.candidate_id
        )
        LIMIT 2
      ) AS mutual_sample_names
    FROM filtered fx
    GROUP BY candidate_id
  )
  SELECT
    a.candidate_id,
    sp.display_name,
    sp.avatar_url,
    a.mutual_count,
    a.mutual_sample_names
  FROM aggregated a
  JOIN public.safe_profiles sp ON sp.id = a.candidate_id
  ORDER BY a.mutual_count DESC, sp.display_name ASC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_people_you_may_know(integer) TO authenticated;

-- 8. Trigger: emit dm_message notification on new DM message
CREATE OR REPLACE FUNCTION public.notify_on_dm_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_dm boolean;
  v_sender_name text;
  v_recipient uuid;
  v_preview text;
BEGIN
  SELECT (c.dm_key IS NOT NULL) INTO v_is_dm
  FROM public.chats c WHERE c.id = NEW.chat_id;

  IF NOT COALESCE(v_is_dm, false) THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

  SELECT cp.profile_id INTO v_recipient
  FROM public.chat_participants cp
  WHERE cp.chat_id = NEW.chat_id AND cp.profile_id <> NEW.sender_id
  LIMIT 1;

  IF v_recipient IS NULL THEN
    RETURN NEW;
  END IF;

  v_preview := COALESCE(NULLIF(left(NEW.content, 80), ''), 'Sent a message');

  INSERT INTO public.notifications (profile_id, type, title, body, data, read)
  VALUES (
    v_recipient,
    'dm_message',
    COALESCE(v_sender_name, 'Someone'),
    v_preview,
    jsonb_build_object(
      'chat_id', NEW.chat_id,
      'sender_profile_id', NEW.sender_id,
      'dedupe_key', 'dm:' || NEW.chat_id::text
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_dm_message ON public.messages;
CREATE TRIGGER notify_on_dm_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_dm_message();
