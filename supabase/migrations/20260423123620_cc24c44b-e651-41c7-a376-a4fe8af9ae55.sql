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

  RETURN NEW;
END;
$function$;

WITH normalized AS (
  SELECT
    n.id,
    n.profile_id,
    n.created_at,
    n.title,
    n.body,
    CASE
      WHEN n.data ? 'source_profile_id'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (n.data->>'source_profile_id')::uuid
        )
      THEN (n.data->>'source_profile_id')::uuid
      WHEN n.data ? 'source_profile_id'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.user_id = (n.data->>'source_profile_id')::uuid
        )
      THEN (
        SELECT p.id
        FROM public.profiles p
        WHERE p.user_id = (n.data->>'source_profile_id')::uuid
        LIMIT 1
      )
      WHEN n.data ? 'new_user_id'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.user_id = (n.data->>'new_user_id')::uuid
        )
      THEN (
        SELECT p.id
        FROM public.profiles p
        WHERE p.user_id = (n.data->>'new_user_id')::uuid
        LIMIT 1
      )
      ELSE NULL
    END AS joined_profile_id,
    CASE
      WHEN n.title = '🎉 Someone joined R@lly because of you!'
       AND n.data ? 'source_profile_id'
       AND EXISTS (
         SELECT 1
         FROM public.profiles p
         WHERE p.id = (n.data->>'source_profile_id')::uuid
       ) THEN 1
      WHEN n.title LIKE '%joined R@lly using your link.%' THEN 2
      ELSE 3
    END AS preference_rank
  FROM public.notifications n
  WHERE n.type = 'referral_success'
), ranked_notifications AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY profile_id, joined_profile_id
      ORDER BY preference_rank, created_at DESC, id DESC
    ) AS rn
  FROM normalized
  WHERE joined_profile_id IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked_notifications r
WHERE n.id = r.id
  AND r.rn > 1;

WITH bad_referral_rows AS (
  SELECT l.id, l.user_id
  FROM public.rly_points_ledger l
  WHERE l.event_type = 'referral_signup'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = l.source_id
    )
), deleted_bad_rows AS (
  DELETE FROM public.rly_points_ledger l
  USING bad_referral_rows b
  WHERE l.id = b.id
  RETURNING b.user_id
), affected_users AS (
  SELECT DISTINCT user_id FROM deleted_bad_rows
)
SELECT public.rly_recalc_user_badge(user_id)
FROM affected_users;