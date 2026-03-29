-- 1. ATTACH existing trigger functions to tables
DROP TRIGGER IF EXISTS trg_notify_on_squad_invite ON public.squad_invites;
CREATE TRIGGER trg_notify_on_squad_invite
  AFTER INSERT ON public.squad_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_squad_invite();

DROP TRIGGER IF EXISTS trg_notify_on_event_invite ON public.event_invites;
CREATE TRIGGER trg_notify_on_event_invite
  AFTER INSERT ON public.event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_event_invite();

-- 2. Rally started trigger
CREATE OR REPLACE FUNCTION public.notify_on_rally_started()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_creator_name text;
  v_profile_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM 'live' AND NEW.status = 'live' THEN
    SELECT display_name INTO v_creator_name FROM profiles WHERE id = NEW.creator_id;

    FOR v_profile_id IN
      SELECT ea.profile_id FROM event_attendees ea
      WHERE ea.event_id = NEW.id AND ea.profile_id != NEW.creator_id
    LOOP
      INSERT INTO notifications (profile_id, type, title, body, data, read)
      VALUES (
        v_profile_id,
        'rally_started',
        '"' || COALESCE(NEW.title, 'A R@lly') || '" has started!',
        COALESCE(v_creator_name, 'Someone') || '''s R@lly is live now',
        jsonb_build_object('event_id', NEW.id),
        false
      );
    END LOOP;

    FOR v_profile_id IN
      SELECT ei.invited_profile_id FROM event_invites ei
      WHERE ei.event_id = NEW.id
        AND ei.status = 'pending'
        AND ei.invited_profile_id != NEW.creator_id
        AND ei.invited_profile_id NOT IN (
          SELECT ea2.profile_id FROM event_attendees ea2 WHERE ea2.event_id = NEW.id
        )
    LOOP
      INSERT INTO notifications (profile_id, type, title, body, data, read)
      VALUES (
        v_profile_id,
        'rally_started',
        '"' || COALESCE(NEW.title, 'A R@lly') || '" has started!',
        COALESCE(v_creator_name, 'Someone') || '''s R@lly is live — you''re still invited',
        jsonb_build_object('event_id', NEW.id),
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_rally_started ON public.events;
CREATE TRIGGER trg_notify_on_rally_started
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_rally_started();

-- 3. Grouped chat message alerts
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_chat record;
  v_participant record;
  v_alert_type text;
  v_chat_name text;
  v_existing_id uuid;
  v_existing_data jsonb;
  v_count int;
BEGIN
  SELECT * INTO v_chat FROM chats WHERE id = NEW.chat_id;
  IF v_chat IS NULL THEN RETURN NEW; END IF;

  IF v_chat.squad_id IS NOT NULL THEN
    v_alert_type := 'squad_chat_unread';
    SELECT name INTO v_chat_name FROM squads WHERE id = v_chat.squad_id;
  ELSIF v_chat.event_id IS NOT NULL OR v_chat.linked_event_id IS NOT NULL THEN
    v_alert_type := 'rally_chat_unread';
    SELECT title INTO v_chat_name FROM events WHERE id = COALESCE(v_chat.event_id, v_chat.linked_event_id);
  ELSE
    v_alert_type := 'chat_unread';
    v_chat_name := COALESCE(v_chat.name, 'a chat');
  END IF;

  FOR v_participant IN
    SELECT cp.profile_id FROM chat_participants cp
    WHERE cp.chat_id = NEW.chat_id AND cp.profile_id != NEW.sender_id
  LOOP
    SELECT id, data INTO v_existing_id, v_existing_data
    FROM notifications
    WHERE profile_id = v_participant.profile_id
      AND type = v_alert_type
      AND read = false
      AND (data->>'chat_id')::text = NEW.chat_id::text
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_count := COALESCE((v_existing_data->>'unread_count')::int, 1) + 1;
      UPDATE notifications
      SET title = v_count || ' new messages in ' || COALESCE(v_chat_name, 'a chat'),
          data = v_existing_data || jsonb_build_object('unread_count', v_count),
          created_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO notifications (profile_id, type, title, body, data, read)
      VALUES (
        v_participant.profile_id,
        v_alert_type,
        '1 new message in ' || COALESCE(v_chat_name, 'a chat'),
        NULL,
        jsonb_build_object(
          'chat_id', NEW.chat_id,
          'unread_count', 1,
          'squad_id', v_chat.squad_id,
          'event_id', COALESCE(v_chat.event_id, v_chat.linked_event_id)
        ),
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_chat_message ON public.messages;
CREATE TRIGGER trg_notify_on_chat_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_chat_message();

-- 4. Enable realtime on notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;