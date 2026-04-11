
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _display_name text;
  _phone text;
  _referred_by uuid;
  _is_founding boolean;
  _founder_num integer;
  _needs_name boolean;
  _email text;
  _meta_founding text;
BEGIN
  _email := NEW.email;

  -- Name fallback chain
  _display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')
  );

  -- If still null, use email prefix unless it's an Apple private relay
  IF _display_name IS NULL THEN
    IF _email LIKE '%@privaterelay.appleid.com' THEN
      _display_name := 'R@lly Member';
    ELSE
      _display_name := split_part(_email, '@', 1);
    END IF;
  END IF;

  -- Check if name needs setup (Apple relay or generic)
  _needs_name := false;
  IF _display_name = 'R@lly Member' THEN
    _needs_name := true;
  END IF;

  _phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  -- Referral
  _referred_by := NULL;
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL
     AND NEW.raw_user_meta_data->>'referred_by' != '' THEN
    BEGIN
      _referred_by := (NEW.raw_user_meta_data->>'referred_by')::uuid;
    EXCEPTION WHEN OTHERS THEN
      _referred_by := NULL;
    END;
  END IF;

  -- Founding member check — accept both boolean true and string 'true'
  _is_founding := false;
  _founder_num := NULL;
  _meta_founding := NEW.raw_user_meta_data->>'founding_member';

  IF _meta_founding IS NOT NULL AND (_meta_founding = 'true' OR _meta_founding = 'True' OR _meta_founding = 'TRUE') THEN
    -- Serialize founder-number allocation to prevent collisions
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

  -- Award referral points
  IF _referred_by IS NOT NULL THEN
    BEGIN
      PERFORM rly_award_points(_referred_by, 'referral', 50, NEW.id::text);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Harden claim_founding_spot with advisory lock
CREATE OR REPLACE FUNCTION public.claim_founding_spot(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _profile_age interval;
  _already_founding boolean;
  _next_number integer;
BEGIN
  SELECT
    (now() - created_at),
    COALESCE(founding_member, false)
  INTO _profile_age, _already_founding
  FROM profiles WHERE user_id = p_user_id;

  -- Idempotent: already a founder
  IF _already_founding THEN
    RETURN true;
  END IF;

  -- Only allow for profiles < 24h old
  IF _profile_age > interval '24 hours' THEN
    RETURN false;
  END IF;

  -- Serialize founder-number allocation
  PERFORM pg_advisory_xact_lock(42);

  SELECT COALESCE(MAX(founder_number), 0) + 1 INTO _next_number
  FROM profiles WHERE founding_member = true;

  IF _next_number > 25 THEN
    RETURN false;
  END IF;

  UPDATE profiles
  SET founding_member = true, founder_number = _next_number
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;
