
-- Replace event_invite trigger with upsert that consolidates per (recipient, event)
CREATE OR REPLACE FUNCTION public.notify_on_event_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_name text;
  v_event_title text;
  v_existing_id uuid;
  v_existing_data jsonb;
  v_inviters jsonb;
  v_names jsonb;
  v_first_name text;
  v_count int;
  v_new_body text;
  v_new_title text;
BEGIN
  SELECT COALESCE(NULLIF(trim(display_name), ''), NULLIF(trim(full_name), ''), 'Someone')
    INTO v_inviter_name FROM profiles WHERE id = NEW.invited_by;
  SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id;

  v_new_title := 'You''re invited to ' || COALESCE(v_event_title, 'a R@lly');

  -- Find existing invite alert for this (recipient, event)
  SELECT id, data INTO v_existing_id, v_existing_data
  FROM notifications
  WHERE profile_id = NEW.invited_profile_id
    AND type IN ('rally_invite', 'event_invite')
    AND (data->>'event_id')::uuid = NEW.event_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    -- Brand new alert
    INSERT INTO notifications (profile_id, type, title, body, data, read)
    VALUES (
      NEW.invited_profile_id,
      'rally_invite',
      v_new_title,
      v_inviter_name || ' invited you. Tap to RSVP.',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'invite_id', NEW.id,
        'invited_by', NEW.invited_by,
        'inviters', jsonb_build_array(NEW.invited_by),
        'inviter_names', jsonb_build_array(v_inviter_name),
        'responded', false
      ),
      false
    );
  ELSIF COALESCE(v_existing_data->>'responded', 'false') = 'true' THEN
    -- Already RSVPed; do not re-fire
    RETURN NEW;
  ELSE
    v_inviters := COALESCE(v_existing_data->'inviters', '[]'::jsonb);
    v_names := COALESCE(v_existing_data->'inviter_names', '[]'::jsonb);

    -- Append inviter if not already present
    IF NOT (v_inviters @> to_jsonb(NEW.invited_by)) THEN
      v_inviters := v_inviters || to_jsonb(NEW.invited_by);
      v_names := v_names || to_jsonb(v_inviter_name);
    END IF;

    v_count := jsonb_array_length(v_inviters);
    v_first_name := v_names->>0;

    IF v_count <= 1 THEN
      v_new_body := v_first_name || ' invited you. Tap to RSVP.';
    ELSE
      v_new_body := v_first_name || ' + ' || (v_count - 1) || CASE WHEN v_count - 1 = 1 THEN ' other' ELSE ' others' END || ' invited you. Tap to RSVP.';
    END IF;

    UPDATE notifications
    SET title = v_new_title,
        body = v_new_body,
        type = 'rally_invite',
        data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
          'event_id', NEW.event_id,
          'inviters', v_inviters,
          'inviter_names', v_names,
          'invited_by', NEW.invited_by,
          'invite_id', NEW.id,
          'responded', false
        ),
        read = false,
        created_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Mark invite alert as responded when invite status changes
CREATE OR REPLACE FUNCTION public.mark_invite_notification_responded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('accepted', 'declined')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE notifications
    SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object('responded', true),
        read = true
    WHERE profile_id = NEW.invited_profile_id
      AND type IN ('rally_invite', 'event_invite')
      AND (data->>'event_id')::uuid = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_invite_notification_responded ON public.event_invites;
CREATE TRIGGER trg_mark_invite_notification_responded
  AFTER UPDATE ON public.event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_invite_notification_responded();

-- ============= BACKFILL =============
-- Collapse existing duplicate invite alerts into a single consolidated row per (recipient, event)
DO $$
DECLARE
  r record;
  v_inviters jsonb;
  v_names jsonb;
  v_first_name text;
  v_count int;
  v_event_title text;
  v_keep_id uuid;
  v_body text;
  v_title text;
BEGIN
  FOR r IN
    SELECT profile_id, (data->>'event_id')::uuid AS event_id
    FROM notifications
    WHERE type IN ('rally_invite', 'event_invite')
      AND data ? 'event_id'
    GROUP BY profile_id, (data->>'event_id')::uuid
  LOOP
    -- Aggregate distinct inviters from event_invites for this pair
    SELECT
      COALESCE(jsonb_agg(DISTINCT to_jsonb(ei.invited_by)) FILTER (WHERE ei.invited_by IS NOT NULL), '[]'::jsonb)
      INTO v_inviters
    FROM event_invites ei
    WHERE ei.event_id = r.event_id AND ei.invited_profile_id = r.profile_id;

    -- Build matching names array
    SELECT COALESCE(jsonb_agg(COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.full_name), ''), 'Someone')), '[]'::jsonb)
      INTO v_names
    FROM jsonb_array_elements_text(v_inviters) AS x(uid)
    LEFT JOIN profiles p ON p.id = x.uid::uuid;

    SELECT title INTO v_event_title FROM events WHERE id = r.event_id;

    v_count := jsonb_array_length(v_inviters);
    v_first_name := COALESCE(v_names->>0, 'Someone');
    v_title := 'You''re invited to ' || COALESCE(v_event_title, 'a R@lly');

    IF v_count <= 1 THEN
      v_body := v_first_name || ' invited you. Tap to RSVP.';
    ELSE
      v_body := v_first_name || ' + ' || (v_count - 1) || CASE WHEN v_count - 1 = 1 THEN ' other' ELSE ' others' END || ' invited you. Tap to RSVP.';
    END IF;

    -- Keep the most recent notification, delete the rest
    SELECT id INTO v_keep_id
    FROM notifications
    WHERE profile_id = r.profile_id
      AND type IN ('rally_invite', 'event_invite')
      AND (data->>'event_id')::uuid = r.event_id
    ORDER BY created_at DESC
    LIMIT 1;

    DELETE FROM notifications
    WHERE profile_id = r.profile_id
      AND type IN ('rally_invite', 'event_invite')
      AND (data->>'event_id')::uuid = r.event_id
      AND id <> v_keep_id;

    UPDATE notifications
    SET type = 'rally_invite',
        title = v_title,
        body = v_body,
        data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
          'event_id', r.event_id,
          'inviters', v_inviters,
          'inviter_names', v_names,
          'responded', COALESCE(data->>'responded', 'false')::boolean
        )
    WHERE id = v_keep_id;
  END LOOP;
END $$;
