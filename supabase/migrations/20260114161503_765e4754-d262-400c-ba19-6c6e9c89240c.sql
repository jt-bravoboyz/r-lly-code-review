-- Fix 1: Update generate_secure_invite_code to explicitly use extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_secure_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  raw_bytes bytea;
  encoded text;
BEGIN
  -- Explicitly use extensions schema for gen_random_bytes
  raw_bytes := extensions.gen_random_bytes(12);
  encoded := encode(raw_bytes, 'base64');
  RETURN upper(replace(replace(encoded, '+', 'X'), '/', 'Y'));
END;
$$;

-- Fix 2: Update create_event_chat_on_event_create to use correct ON CONFLICT clause
CREATE OR REPLACE FUNCTION public.create_event_chat_on_event_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chats (event_id, is_group, name)
  VALUES (NEW.id, true, NEW.title)
  ON CONFLICT ON CONSTRAINT idx_unique_event_chat DO NOTHING;
  RETURN NEW;
END;
$$;