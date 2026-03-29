
-- Update squad invite trigger to handle in_app invite type (profile:UUID format)
CREATE OR REPLACE FUNCTION public.notify_on_squad_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_name text;
  v_squad_name text;
  v_matched_profile_id uuid;
  v_normalized_phone text;
BEGIN
  SELECT display_name INTO v_inviter_name FROM profiles WHERE id = NEW.invited_by;
  SELECT name INTO v_squad_name FROM squads WHERE id = NEW.squad_id;

  -- Match contact to a profile
  IF NEW.invite_type = 'in_app' AND starts_with(NEW.contact_value, 'profile:') THEN
    -- Direct profile ID reference
    v_matched_profile_id := substring(NEW.contact_value from 9)::uuid;
  ELSIF NEW.invite_type = 'sms' THEN
    v_normalized_phone := regexp_replace(NEW.contact_value, '[^0-9]', '', 'g');
    v_normalized_phone := right(v_normalized_phone, 10);
    SELECT id INTO v_matched_profile_id
    FROM profiles
    WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = v_normalized_phone
    LIMIT 1;
  ELSIF NEW.invite_type = 'email' AND NEW.contact_value NOT IN ('link-share', 'native-share') THEN
    SELECT p.id INTO v_matched_profile_id
    FROM auth.users u
    JOIN profiles p ON p.user_id = u.id
    WHERE lower(u.email) = lower(NEW.contact_value)
    LIMIT 1;
  END IF;

  IF v_matched_profile_id IS NOT NULL THEN
    INSERT INTO notifications (profile_id, type, title, body, data, read)
    VALUES (
      v_matched_profile_id,
      'squad_invite',
      COALESCE(v_inviter_name, 'Someone') || ' invited you to join "' || COALESCE(v_squad_name, 'a Squad') || '"',
      'Tap to accept or decline',
      jsonb_build_object('squad_id', NEW.squad_id, 'invite_code', NEW.invite_code, 'invite_id', NEW.id),
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
