-- 1. Lock down realtime.messages: deny by default, allow only typing_indicator:* topics
DROP POLICY IF EXISTS "Deny realtime by default - select" ON realtime.messages;
DROP POLICY IF EXISTS "Deny realtime by default - insert" ON realtime.messages;
DROP POLICY IF EXISTS "Allow typing indicator topics - select" ON realtime.messages;
DROP POLICY IF EXISTS "Allow typing indicator topics - insert" ON realtime.messages;

CREATE POLICY "Allow typing indicator topics - select"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (realtime.topic() LIKE 'typing_indicator:%');

CREATE POLICY "Allow typing indicator topics - insert"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (realtime.topic() LIKE 'typing_indicator:%');

-- 2. Invite history: add hidden_at soft-delete column + DELETE policy
ALTER TABLE public.invite_history
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invite_history_inviter_visible
  ON public.invite_history (inviter_id) WHERE hidden_at IS NULL;

DROP POLICY IF EXISTS "Users can delete their invite history" ON public.invite_history;
CREATE POLICY "Users can delete their invite history"
  ON public.invite_history FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = invite_history.inviter_id
    )
  );