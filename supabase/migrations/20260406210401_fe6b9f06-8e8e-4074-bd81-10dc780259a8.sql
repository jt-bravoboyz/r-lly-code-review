
CREATE OR REPLACE FUNCTION public.rly_auto_referral_on_profile_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_user_id UUID;
BEGIN
  -- Only fire when referred_by is being set for the first time
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, skip if referred_by was already set
  IF TG_OP = 'UPDATE' AND OLD.referred_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the referrer's user_id
  SELECT user_id INTO v_referrer_user_id
  FROM public.profiles
  WHERE id = NEW.referred_by;

  IF v_referrer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Award points (handles dedup via ON CONFLICT and sends notification)
  PERFORM public.rly_award_points(v_referrer_user_id, 'referral_signup', NEW.id);

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_auto_referral_reward ON public.profiles;
CREATE TRIGGER tr_auto_referral_reward
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referred_by IS NOT NULL)
  EXECUTE FUNCTION public.rly_auto_referral_on_profile_change();
