CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_chat record;
  v_participant record;
  v_alert_type text;
  v_chat_name text;
  v_existing_id uuid;
  v_existing_data jsonb;
  v_count int;
BEGIN
  IF COALESCE(NEW.message_type, 'text') = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_chat FROM public.chats WHERE id = NEW.chat_id;
  IF v_chat IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_chat.squad_id IS NOT NULL THEN
    v_alert_type := 'squad_chat_unread';
    SELECT name INTO v_chat_name FROM public.squads WHERE id = v_chat.squad_id;
  ELSIF v_chat.event_id IS NOT NULL OR v_chat.linked_event_id IS NOT NULL THEN
    v_alert_type := 'rally_chat_unread';
    SELECT title INTO v_chat_name FROM public.events WHERE id = COALESCE(v_chat.event_id, v_chat.linked_event_id);
  ELSE
    v_alert_type := 'chat_unread';
    v_chat_name := COALESCE(v_chat.name, 'Chat');
  END IF;

  FOR v_participant IN
    SELECT cp.profile_id
    FROM public.chat_participants cp
    WHERE cp.chat_id = NEW.chat_id
      AND cp.profile_id != NEW.sender_id
  LOOP
    SELECT id, data
    INTO v_existing_id, v_existing_data
    FROM public.notifications
    WHERE profile_id = v_participant.profile_id
      AND type = v_alert_type
      AND read = false
      AND data @> jsonb_build_object('chat_id', NEW.chat_id)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_count := COALESCE((v_existing_data ->> 'unread_count')::int, 1) + 1;

      UPDATE public.notifications
      SET title = 'You have ' || v_count || ' missed messages from "' || COALESCE(v_chat_name, 'Chat') || '"',
          body = 'Open chat to catch up',
          data = COALESCE(v_existing_data, '{}'::jsonb) || jsonb_build_object(
            'chat_id', NEW.chat_id,
            'chat_name', v_chat_name,
            'unread_count', v_count,
            'squad_id', v_chat.squad_id,
            'event_id', COALESCE(v_chat.event_id, v_chat.linked_event_id)
          ),
          read = false,
          created_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO public.notifications (profile_id, type, title, body, data, read)
      VALUES (
        v_participant.profile_id,
        v_alert_type,
        'You have 1 missed message from "' || COALESCE(v_chat_name, 'Chat') || '"',
        'Open chat to catch up',
        jsonb_build_object(
          'chat_id', NEW.chat_id,
          'chat_name', v_chat_name,
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_squad_chat_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'chats' THEN
    IF NEW.squad_id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.chat_participants (chat_id, profile_id)
    SELECT NEW.id, participant_id
    FROM (
      SELECT s.owner_id AS participant_id
      FROM public.squads s
      WHERE s.id = NEW.squad_id
      UNION
      SELECT sm.profile_id AS participant_id
      FROM public.squad_members sm
      WHERE sm.squad_id = NEW.squad_id
    ) participants
    ON CONFLICT DO NOTHING;

    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chat_participants (chat_id, profile_id)
    SELECT c.id, NEW.profile_id
    FROM public.chats c
    WHERE c.squad_id = NEW.squad_id
    ON CONFLICT DO NOTHING;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.chat_participants cp
    USING public.chats c
    WHERE c.id = cp.chat_id
      AND c.squad_id = OLD.squad_id
      AND cp.profile_id = OLD.profile_id;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_squad_chat_participants_on_chat ON public.chats;
CREATE TRIGGER trg_sync_squad_chat_participants_on_chat
AFTER INSERT OR UPDATE OF squad_id ON public.chats
FOR EACH ROW
EXECUTE FUNCTION public.sync_squad_chat_participants();

DROP TRIGGER IF EXISTS trg_sync_squad_chat_participants_on_member_change ON public.squad_members;
CREATE TRIGGER trg_sync_squad_chat_participants_on_member_change
AFTER INSERT OR DELETE ON public.squad_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_squad_chat_participants();