-- 1. Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS nickname  text;

-- 2. Backfill full_name from existing display_name
UPDATE public.profiles
SET full_name = display_name
WHERE full_name IS NULL;

-- 3. Sync trigger
CREATE OR REPLACE FUNCTION public.sync_profile_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.display_name := COALESCE(
    NULLIF(trim(NEW.nickname), ''),
    NULLIF(trim(NEW.full_name), ''),
    NEW.display_name
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_display_name ON public.profiles;
CREATE TRIGGER trg_sync_profile_display_name
BEFORE INSERT OR UPDATE OF full_name, nickname ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_display_name();

-- 4. Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _display_name text;
  _full_name text;
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

  IF _name_part_count >= 2 AND _display_name <> 'R@lly Member' THEN
    _full_name := _display_name;
  ELSE
    _full_name := NULL;
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

  INSERT INTO public.profiles (user_id, display_name, full_name, phone, referred_by, needs_name_setup, founding_member, founder_number)
  VALUES (NEW.id, _display_name, _full_name, _phone, _referred_by, _needs_name, _is_founding, _founder_num);

  RETURN NEW;
END;
$function$;

-- 5. Drop and recreate views (column order changes require DROP)
DROP VIEW IF EXISTS public.safe_profiles CASCADE;
DROP VIEW IF EXISTS public.public_profiles CASCADE;
DROP VIEW IF EXISTS public.safe_profiles_with_connection CASCADE;

CREATE VIEW public.safe_profiles AS
SELECT id, user_id, display_name, full_name, nickname, avatar_url, bio, badges, reward_points, created_at, founding_member
FROM public.profiles;

CREATE VIEW public.public_profiles AS
SELECT id, user_id, display_name, full_name, nickname, avatar_url, bio, badges, reward_points, created_at
FROM public.profiles;

CREATE VIEW public.safe_profiles_with_connection AS
SELECT id, user_id, display_name, full_name, nickname, avatar_url, bio, badges, reward_points, created_at, founding_member, founder_number
FROM public.profiles p;

-- 6. admin_user_directory: drop & recreate (signature changed)
DROP FUNCTION IF EXISTS public.admin_user_directory();
CREATE FUNCTION public.admin_user_directory()
 RETURNS TABLE(profile_id uuid, user_id uuid, display_name text, full_name text, nickname text, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, founding_member boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    p.id as profile_id,
    p.user_id,
    p.display_name,
    p.full_name,
    p.nickname,
    u.email::text,
    p.created_at,
    u.last_sign_in_at,
    p.founding_member
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.has_role(auth.uid(), 'admin'::app_role);
$function$;