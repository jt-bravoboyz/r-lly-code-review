-- Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, profile_id, emoji)
);
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat members can view reactions"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_chat_member(m.chat_id)));

CREATE POLICY "Chat members can add own reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_chat_member(m.chat_id))
  );

CREATE POLICY "Users can remove own reactions"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (profile_id = public.current_profile_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Message reads
CREATE TABLE public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, profile_id)
);
CREATE INDEX idx_message_reads_message ON public.message_reads(message_id);
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat members can view reads"
  ON public.message_reads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_chat_member(m.chat_id)));

CREATE POLICY "Users can insert own reads"
  ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_chat_member(m.chat_id))
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;