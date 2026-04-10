
-- 1. Add needs_name_setup column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_name_setup boolean NOT NULL DEFAULT false;

-- 2. Update handle_new_user() with robust name fallback + referral extraction
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
  v_email text;
  v_is_private_relay boolean;
  v_needs_name_setup boolean := false;
  v_referred_by_id uuid;
  v_referrer_user_id uuid;
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'Invalid user data: missing id';
  END IF;

  v_email := COALESCE(NEW.email, '');
  v_is_private_relay := v_email LIKE '%@privaterelay.appleid.com';

  -- Name fallback chain: display_name -> full_name -> name -> email prefix -> 'R@lly Member'
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    CASE 
      WHEN v_is_private_relay THEN NULL
      WHEN v_email != '' THEN NULLIF(TRIM(split_part(v_email, '@', 1)), '')
      ELSE NULL
    END,
    'R@lly Member'
  );

  -- Truncate to 100 chars
  v_display_name := SUBSTRING(v_display_name, 1, 100);

  -- Flag users who ended up with generic name
  IF v_display_name = 'R@lly Member' OR v_is_private_relay THEN
    v_needs_name_setup := true;
  END IF;

  -- Extract referred_by from metadata
  v_referred_by_id := NULL;
  BEGIN
    IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
      v_referred_by_id := (NEW.raw_user_meta_data->>'referred_by')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_referred_by_id := NULL;
  END;

  BEGIN
    INSERT INTO public.profiles (user_id, display_name, phone, policies_accepted_at, needs_name_setup, referred_by)
    VALUES (
      NEW.id,
      v_display_name,
      NEW.raw_user_meta_data->>'phone',
      now(),
      v_needs_name_setup,
      v_referred_by_id
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(NULLIF(TRIM(EXCLUDED.display_name), ''), profiles.display_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      policies_accepted_at = COALESCE(profiles.policies_accepted_at, now()),
      needs_name_setup = CASE WHEN profiles.needs_name_setup THEN profiles.needs_name_setup ELSE EXCLUDED.needs_name_setup END,
      referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by);

    -- Award referral points if referred_by was set
    IF v_referred_by_id IS NOT NULL THEN
      SELECT user_id INTO v_referrer_user_id FROM public.profiles WHERE id = v_referred_by_id;
      IF v_referrer_user_id IS NOT NULL THEN
        BEGIN
          PERFORM public.rly_award_points(v_referrer_user_id, 'referral_signup', (SELECT id FROM public.profiles WHERE user_id = NEW.id));
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'Referral points award failed for user %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RAISE;
  END;

  RETURN NEW;
END;
$function$;

-- 3. Create set_referral RPC for post-OAuth referral attribution
CREATE OR REPLACE FUNCTION public.set_referral(p_user_id uuid, p_referrer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_created timestamptz;
  v_existing_referrer uuid;
  v_referrer_user_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get profile info
  SELECT created_at, referred_by, id INTO v_profile_created, v_existing_referrer, v_profile_id
  FROM public.profiles WHERE user_id = p_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Only allow for profiles < 24h old
  IF v_profile_created < (now() - interval '24 hours') THEN
    RAISE EXCEPTION 'Profile too old for referral attribution';
  END IF;

  -- Don't overwrite existing referral
  IF v_existing_referrer IS NOT NULL THEN
    RETURN;
  END IF;

  -- Don't allow self-referral
  IF v_profile_id = p_referrer_id THEN
    RETURN;
  END IF;

  -- Set the referral
  UPDATE public.profiles SET referred_by = p_referrer_id WHERE user_id = p_user_id;

  -- Award points to referrer
  SELECT user_id INTO v_referrer_user_id FROM public.profiles WHERE id = p_referrer_id;
  IF v_referrer_user_id IS NOT NULL THEN
    PERFORM public.rly_award_points(v_referrer_user_id, 'referral_signup', v_profile_id);
  END IF;
END;
$function$;

-- 4. Backfill: Fix Apple Private Relay profiles
UPDATE public.profiles
SET display_name = 'R@lly Member', needs_name_setup = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@privaterelay.appleid.com'
)
AND (display_name IS NULL OR display_name = '' OR display_name ~ '^[a-z0-9]{8,}$');
