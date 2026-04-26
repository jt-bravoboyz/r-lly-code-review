-- Drop any existing typing_indicator policies on realtime.messages
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
  END LOOP;
END $$;

-- Allow chat members to RECEIVE typing_indicator broadcasts for chats they belong to
CREATE POLICY "Chat members can receive typing_indicator broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'typing_indicator:chat-%'
  AND public.is_chat_member(
    substring(realtime.topic() from 'typing_indicator:chat-(.+)')::uuid
  )
);

-- Allow chat members to SEND typing_indicator broadcasts for chats they belong to
CREATE POLICY "Chat members can send typing_indicator broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'typing_indicator:chat-%'
  AND public.is_chat_member(
    substring(realtime.topic() from 'typing_indicator:chat-(.+)')::uuid
  )
);
