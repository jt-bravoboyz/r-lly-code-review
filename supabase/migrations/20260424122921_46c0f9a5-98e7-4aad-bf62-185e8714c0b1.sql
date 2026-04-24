DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendship_status') THEN
    CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self_request CHECK (requester_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair_idx
ON public.friendships (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships (requester_id);
CREATE INDEX IF NOT EXISTS friendships_recipient_idx ON public.friendships (recipient_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON public.friendships (status);
CREATE INDEX IF NOT EXISTS friendships_accepted_lookup_idx ON public.friendships (status, requester_id, recipient_id) WHERE status = 'accepted';

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.are_rally_friends(p_profile_a uuid, p_profile_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = p_profile_a AND f.recipient_id = p_profile_b)
        OR (f.requester_id = p_profile_b AND f.recipient_id = p_profile_a))
  )
$$;

DROP POLICY IF EXISTS "Friendship participants can view their rows" ON public.friendships;
CREATE POLICY "Friendship participants can view their rows"
ON public.friendships
FOR SELECT
TO authenticated
USING (public.current_profile_id() IN (requester_id, recipient_id));

DROP POLICY IF EXISTS "Users can request friendships as themselves" ON public.friendships;
CREATE POLICY "Users can request friendships as themselves"
ON public.friendships
FOR INSERT
TO authenticated
WITH CHECK (
  requester_id = public.current_profile_id()
  AND requester_id <> recipient_id
  AND status = 'pending'
);

DROP POLICY IF EXISTS "Recipients can respond and participants can remove" ON public.friendships;
CREATE POLICY "Recipients can respond and participants can remove"
ON public.friendships
FOR UPDATE
TO authenticated
USING (public.current_profile_id() IN (requester_id, recipient_id))
WITH CHECK (
  public.current_profile_id() IN (requester_id, recipient_id)
  AND (
    (public.current_profile_id() = recipient_id AND status IN ('accepted', 'declined', 'blocked'))
    OR (public.current_profile_id() = requester_id AND status IN ('pending', 'declined'))
  )
);

DROP POLICY IF EXISTS "Friendship participants can delete their rows" ON public.friendships;
CREATE POLICY "Friendship participants can delete their rows"
ON public.friendships
FOR DELETE
TO authenticated
USING (public.current_profile_id() IN (requester_id, recipient_id));

CREATE OR REPLACE FUNCTION public.touch_friendship_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'declined', 'blocked') THEN
    NEW.responded_at = COALESCE(NEW.responded_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_touch_updated_at ON public.friendships;
CREATE TRIGGER friendships_touch_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.touch_friendship_updated_at();

CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name text;
  v_requester_avatar text;
BEGIN
  SELECT display_name, avatar_url
  INTO v_requester_name, v_requester_avatar
  FROM public.safe_profiles
  WHERE id = NEW.requester_id;

  INSERT INTO public.notifications (profile_id, type, title, body, data, read)
  VALUES (
    NEW.recipient_id,
    'friend_request',
    'New R@lly Friend request',
    COALESCE(v_requester_name, 'Someone') || ' wants to add you on R@lly',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'requester_profile_id', NEW.requester_id,
      'requester_display_name', v_requester_name,
      'requester_avatar_url', v_requester_avatar
    ),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_notify_on_insert ON public.friendships;
CREATE TRIGGER friendships_notify_on_insert
AFTER INSERT ON public.friendships
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_on_friend_request();

CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text, p_limit integer DEFAULT 12)
RETURNS TABLE(id uuid, display_name text, avatar_url text, bio text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id, sp.display_name, sp.avatar_url, sp.bio
  FROM public.safe_profiles sp
  WHERE auth.uid() IS NOT NULL
    AND NULLIF(trim(p_query), '') IS NOT NULL
    AND sp.id <> public.current_profile_id()
    AND sp.display_name ILIKE '%' || trim(p_query) || '%'
  ORDER BY sp.display_name ASC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 25)
$$;

CREATE OR REPLACE FUNCTION public.get_accepted_friend_ids(p_profile_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN requester_id = p_profile_id THEN recipient_id
    ELSE requester_id
  END
  FROM public.friendships
  WHERE status = 'accepted'
    AND p_profile_id IN (requester_id, recipient_id)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _display_name text;
  _phone text;
  _referred_by uuid;
  _is_founding boolean;
  _founder_num integer;
  _needs_name boolean;
  _email text;
  _email_prefix text;
  _meta_founding text;
  _name_part_count integer;
BEGIN
  _email := NEW.email;

  _display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')
  );

  IF _display_name IS NULL THEN
    IF _email LIKE '%@privaterelay.appleid.com' THEN
      _display_name := 'R@lly Member';
    ELSE
      _display_name := split_part(_email, '@', 1);
    END IF;
  END IF;

  _email_prefix := split_part(COALESCE(_email, ''), '@', 1);
  SELECT COUNT(*) INTO _name_part_count
  FROM regexp_split_to_table(TRIM(COALESCE(_display_name, '')), '\s+') AS part
  WHERE part <> '';

  _needs_name := false;
  IF _display_name = 'R@lly Member'
     OR _name_part_count < 2
     OR lower(_display_name) = lower(_email_prefix)
     OR _display_name ~ '@'
     OR _display_name ~ '\.' THEN
    _needs_name := true;
  END IF;

  _phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  _referred_by := NULL;
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL
     AND NEW.raw_user_meta_data->>'referred_by' != '' THEN
    BEGIN
      _referred_by := (NEW.raw_user_meta_data->>'referred_by')::uuid;
    EXCEPTION WHEN OTHERS THEN
      _referred_by := NULL;
    END;
  END IF;

  _is_founding := false;
  _founder_num := NULL;
  _meta_founding := NEW.raw_user_meta_data->>'founding_member';

  IF _meta_founding IS NOT NULL AND (_meta_founding = 'true' OR _meta_founding = 'True' OR _meta_founding = 'TRUE') THEN
    PERFORM pg_advisory_xact_lock(42);

    SELECT COALESCE(MAX(founder_number), 0) + 1 INTO _founder_num
    FROM profiles WHERE founding_member = true;

    IF _founder_num <= 25 THEN
      _is_founding := true;
    ELSE
      _founder_num := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, phone, referred_by, needs_name_setup, founding_member, founder_number)
  VALUES (NEW.id, _display_name, _phone, _referred_by, _needs_name, _is_founding, _founder_num);

  RETURN NEW;
END;
$function$;