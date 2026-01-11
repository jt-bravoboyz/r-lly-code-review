-- Add squad_id column to chats table for squad chats
ALTER TABLE public.chats ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE;

-- Add linked_event_id to track when a squad chat is temporarily being used as an event chat
ALTER TABLE public.chats ADD COLUMN linked_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- Create index for faster squad chat lookups
CREATE INDEX idx_chats_squad_id ON public.chats(squad_id);
CREATE INDEX idx_chats_linked_event_id ON public.chats(linked_event_id);

-- Add unique constraint to prevent duplicate squad chats (one chat per squad)
CREATE UNIQUE INDEX unique_squad_chat ON public.chats(squad_id) WHERE squad_id IS NOT NULL;

-- Update RLS policies to allow squad members to access squad chats

-- Policy: Squad members can view their squad's chat
CREATE POLICY "Squad members can view squad chats"
ON public.chats
FOR SELECT
USING (
  squad_id IS NOT NULL AND (
    -- User is the squad owner
    EXISTS (
      SELECT 1 FROM public.squads 
      WHERE squads.id = chats.squad_id 
      AND squads.owner_id = auth.uid()
    )
    OR
    -- User is a squad member
    EXISTS (
      SELECT 1 FROM public.squad_members 
      WHERE squad_members.squad_id = chats.squad_id 
      AND squad_members.profile_id = auth.uid()
    )
  )
);

-- Policy: Squad members can insert into squad chats (for creating the chat)
CREATE POLICY "Squad owners can create squad chats"
ON public.chats
FOR INSERT
WITH CHECK (
  squad_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.squads 
    WHERE squads.id = squad_id 
    AND squads.owner_id = auth.uid()
  )
);

-- Policy: Squad owners can update squad chat (for linking/unlinking events)
CREATE POLICY "Squad owners can update squad chats"
ON public.chats
FOR UPDATE
USING (
  squad_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.squads 
    WHERE squads.id = chats.squad_id 
    AND squads.owner_id = auth.uid()
  )
);

-- Update messages RLS to allow squad members to send messages to squad chats
CREATE POLICY "Squad members can send messages to squad chats"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id
    AND c.squad_id IS NOT NULL
    AND (
      -- User is squad owner
      EXISTS (
        SELECT 1 FROM public.squads s
        WHERE s.id = c.squad_id
        AND s.owner_id = auth.uid()
      )
      OR
      -- User is squad member
      EXISTS (
        SELECT 1 FROM public.squad_members sm
        WHERE sm.squad_id = c.squad_id
        AND sm.profile_id = auth.uid()
      )
    )
  )
);

-- Policy: Squad members can view messages in squad chats
CREATE POLICY "Squad members can view squad chat messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_id
    AND c.squad_id IS NOT NULL
    AND (
      -- User is squad owner
      EXISTS (
        SELECT 1 FROM public.squads s
        WHERE s.id = c.squad_id
        AND s.owner_id = auth.uid()
      )
      OR
      -- User is squad member
      EXISTS (
        SELECT 1 FROM public.squad_members sm
        WHERE sm.squad_id = c.squad_id
        AND sm.profile_id = auth.uid()
      )
    )
  )
);

-- Create squad chats for all existing squads that don't have one
INSERT INTO public.chats (squad_id, is_group, name)
SELECT s.id, true, s.name || ' Chat'
FROM public.squads s
WHERE NOT EXISTS (
  SELECT 1 FROM public.chats c WHERE c.squad_id = s.id
);

-- Enable realtime for chats table if not already
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;