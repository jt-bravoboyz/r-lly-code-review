
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'Invalid user data: missing id';
  END IF;
  
  BEGIN
    INSERT INTO public.profiles (user_id, display_name, phone, policies_accepted_at)
    VALUES (
      NEW.id, 
      SUBSTRING(
        COALESCE(
          NEW.raw_user_meta_data->>'display_name',
          split_part(COALESCE(NEW.email, ''), '@', 1)
        ),
        1, 100
      ),
      NEW.raw_user_meta_data->>'phone',
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      policies_accepted_at = COALESCE(profiles.policies_accepted_at, now());
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RAISE;
  END;
  
  RETURN NEW;
END;
$$;
