-- Fix Squad chat RLS policies - they incorrectly compare profile_id to auth.uid() instead of user_id
-- Drop and recreate with proper user_id checks through profiles table

-- Drop problematic policies
DROP POLICY IF EXISTS "Squad members can view squad chats" ON public.chats;
DROP POLICY IF EXISTS "Squad owners can create squad chats" ON public.chats;
DROP POLICY IF EXISTS "Squad owners can update squad chats" ON public.chats;

-- Recreate with proper profile_id checks
CREATE POLICY "Squad members can view squad chats"
ON public.chats
FOR SELECT
USING (
  squad_id IS NOT NULL AND (
    -- User owns the squad
    EXISTS (
      SELECT 1 FROM squads s
      WHERE s.id = chats.squad_id 
      AND s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
    OR
    -- User is a member of the squad
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = chats.squad_id 
      AND sm.profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Squad owners can create squad chats"
ON public.chats
FOR INSERT
WITH CHECK (
  squad_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM squads s
    WHERE s.id = chats.squad_id 
    AND s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
);

CREATE POLICY "Squad owners can update squad chats"
ON public.chats
FOR UPDATE
USING (
  squad_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM squads s
    WHERE s.id = chats.squad_id 
    AND s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
);

-- Also fix messages RLS for squad chats - squad members should be able to view/send messages
DROP POLICY IF EXISTS "Squad members can view squad chat messages" ON public.messages;
DROP POLICY IF EXISTS "Squad members can send squad chat messages" ON public.messages;

CREATE POLICY "Squad members can view squad chat messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = messages.chat_id
    AND c.squad_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM squads s
        WHERE s.id = c.squad_id 
        AND s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM squad_members sm
        WHERE sm.squad_id = c.squad_id 
        AND sm.profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Squad members can send squad chat messages"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = messages.chat_id
    AND c.squad_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM squads s
        WHERE s.id = c.squad_id 
        AND s.owner_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM squad_members sm
        WHERE sm.squad_id = c.squad_id 
        AND sm.profile_id IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
      )
    )
  )
);