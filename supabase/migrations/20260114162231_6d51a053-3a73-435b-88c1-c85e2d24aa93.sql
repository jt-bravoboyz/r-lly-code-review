-- Fix: The idx_unique_event_chat is an index, not a constraint
-- Use the correct ON CONFLICT syntax matching the partial unique index definition

CREATE OR REPLACE FUNCTION public.create_event_chat_on_event_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chats (event_id, is_group, name)
  VALUES (NEW.id, true, NEW.title)
  ON CONFLICT (event_id) WHERE squad_id IS NULL AND event_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;