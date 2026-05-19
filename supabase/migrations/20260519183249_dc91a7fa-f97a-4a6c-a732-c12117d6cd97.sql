
-- =========================================================
-- STEP 8: Soft-flag event declines
-- =========================================================

ALTER TABLE public.event_attendees
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_by UUID;

-- Replace destructive decline policy with an update policy
DROP POLICY IF EXISTS "Hosts can decline pending attendees" ON public.event_attendees;

CREATE POLICY "Hosts can soft-decline pending attendees"
  ON public.event_attendees
  FOR UPDATE
  TO authenticated
  USING (status = 'pending' AND is_event_host_or_cohost(event_id, auth.uid()))
  WITH CHECK (status IN ('declined', 'pending', 'attending'));

-- RPC: host_decline_attendee
CREATE OR REPLACE FUNCTION public.host_decline_attendee(
  _event_id UUID,
  _profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _host_profile_id UUID;
BEGIN
  IF NOT is_event_host_or_cohost(_event_id, auth.uid()) THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  SELECT id INTO _host_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

  UPDATE event_attendees
  SET status = 'declined',
      declined_at = now(),
      declined_by = _host_profile_id
  WHERE event_id = _event_id
    AND profile_id = _profile_id
    AND status = 'pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: host_reinvite_attendee
CREATE OR REPLACE FUNCTION public.host_reinvite_attendee(
  _event_id UUID,
  _profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _host_profile_id UUID;
BEGIN
  IF NOT is_event_host_or_cohost(_event_id, auth.uid()) THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  SELECT id INTO _host_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;

  UPDATE event_attendees
  SET status = 'pending',
      declined_at = NULL,
      declined_by = NULL
  WHERE event_id = _event_id
    AND profile_id = _profile_id
    AND status = 'declined';

  -- Create a fresh invite row so the invitee sees a new notification
  INSERT INTO event_invites (event_id, invited_by, invited_profile_id, status)
  VALUES (_event_id, _host_profile_id, _profile_id, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =========================================================
-- STEP 13: Expiring invite codes
-- =========================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS invite_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_code_rotated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.rotate_event_invite_code(
  _event_id UUID,
  _ttl_hours INT DEFAULT 168
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_code TEXT;
  _attempts INT := 0;
BEGIN
  IF NOT is_event_host_or_cohost(_event_id, auth.uid()) THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  -- Generate unique 8-char uppercase code
  LOOP
    _new_code := upper(substring(encode(gen_random_bytes(6), 'base64'), 1, 8));
    _new_code := regexp_replace(_new_code, '[^A-Z0-9]', 'X', 'g');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM events WHERE invite_code = _new_code);
    _attempts := _attempts + 1;
    IF _attempts > 8 THEN
      RETURN jsonb_build_object('error', 'code_generation_failed');
    END IF;
  END LOOP;

  UPDATE events
  SET invite_code = _new_code,
      invite_code_expires_at = now() + (_ttl_hours || ' hours')::interval,
      invite_code_rotated_at = now()
  WHERE id = _event_id;

  RETURN jsonb_build_object(
    'success', true,
    'invite_code', _new_code,
    'expires_at', (now() + (_ttl_hours || ' hours')::interval)
  );
END;
$$;
