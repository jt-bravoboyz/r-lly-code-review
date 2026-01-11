-- Add phone column to profiles if it doesn't already exist with proper format
-- Note: The phone column already exists, but we need to ensure it's properly indexed for matching

-- Create index on phone for fast lookups during invite claiming
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Create a trigger to auto-claim phone invites when profile phone is updated
CREATE OR REPLACE FUNCTION public.auto_claim_phone_invites_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if phone changed and is not null
  IF NEW.phone IS NOT NULL AND (OLD.phone IS NULL OR NEW.phone != OLD.phone) THEN
    -- Claim any pending phone invites for this phone number
    PERFORM public.claim_phone_invites(NEW.phone, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_auto_claim_phone_invites ON public.profiles;
CREATE TRIGGER trigger_auto_claim_phone_invites
  AFTER UPDATE OF phone ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_claim_phone_invites_on_profile_update();

-- Also claim on insert if phone is provided
CREATE OR REPLACE FUNCTION public.auto_claim_phone_invites_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    PERFORM public.claim_phone_invites(NEW.phone, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_claim_phone_invites_insert ON public.profiles;
CREATE TRIGGER trigger_auto_claim_phone_invites_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_claim_phone_invites_on_profile_insert();