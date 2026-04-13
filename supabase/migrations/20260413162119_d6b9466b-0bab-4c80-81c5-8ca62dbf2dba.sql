
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
  _referrer_user_id uuid;
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

  _needs_name := false;
  IF _display_name = 'R@lly Member' THEN
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

  -- Award referral points and notify the referring user
  IF _referred_by IS NOT NULL THEN
    BEGIN
      SELECT user_id INTO _referrer_user_id FROM public.profiles WHERE id = _referred_by;
      IF _referrer_user_id IS NOT NULL THEN
        PERFORM public.rly_award_points(_referrer_user_id, 'referral_signup', NEW.id);

        INSERT INTO public.notifications (profile_id, type, title, body, data)
        VALUES (
          _referred_by,
          'referral_success',
          _display_name || ' joined R@lly using your link.',
          'Your referral points have been credited.',
          jsonb_build_object('new_user_id', NEW.id::text)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
