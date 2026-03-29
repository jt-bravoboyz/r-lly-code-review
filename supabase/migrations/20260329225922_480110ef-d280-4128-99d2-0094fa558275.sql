
-- Trigger function: create notification when event_invites row is inserted
CREATE OR REPLACE FUNCTION public.notify_on_event_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_name text;
  v_event_title text;
BEGIN
  -- Get inviter display name
  SELECT display_name INTO v_inviter_name FROM profiles WHERE id = NEW.invited_by;
  -- Get event title
  SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id;

  INSERT INTO notifications (profile_id, type, title, body, data, read)
  VALUES (
    NEW.invited_profile_id,
    'event_invite',
    COALESCE(v_inviter_name, 'Someone') || ' invited you to ' || COALESCE(v_event_title, 'a R@lly'),
    'Tap to accept or decline',
    jsonb_build_object('event_id', NEW.event_id, 'invite_id', NEW.id, 'invited_by', NEW.invited_by),
    false
  );

  RETURN NEW;
END;
$$;

-- Trigger function: create notification when squad_invites row is inserted
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
  v_user_email text;
BEGIN
  -- Get inviter display name and squad name
  SELECT display_name INTO v_inviter_name FROM profiles WHERE id = NEW.invited_by;
  SELECT name INTO v_squad_name FROM squads WHERE id = NEW.squad_id;

  -- Try to match the contact_value to an existing profile
  IF NEW.invite_type = 'sms' THEN
    -- Normalize to last 10 digits
    v_normalized_phone := regexp_replace(NEW.contact_value, '[^0-9]', '', 'g');
    v_normalized_phone := right(v_normalized_phone, 10);
    
    SELECT id INTO v_matched_profile_id
    FROM profiles
    WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = v_normalized_phone
    LIMIT 1;
  ELSIF NEW.invite_type = 'email' AND NEW.contact_value NOT IN ('link-share', 'native-share') THEN
    -- Try to find by email in auth.users
    SELECT p.id INTO v_matched_profile_id
    FROM auth.users u
    JOIN profiles p ON p.user_id = u.id
    WHERE lower(u.email) = lower(NEW.contact_value)
    LIMIT 1;
  END IF;

  -- Only create notification if we found a matching profile
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

-- Create triggers
CREATE TRIGGER trg_notify_event_invite
  AFTER INSERT ON public.event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_event_invite();

CREATE TRIGGER trg_notify_squad_invite
  AFTER INSERT ON public.squad_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_squad_invite();
