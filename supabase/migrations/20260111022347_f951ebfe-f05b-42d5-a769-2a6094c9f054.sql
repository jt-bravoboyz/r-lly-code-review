-- Phase A.1: Auto-add event attendees to chat_participants

-- Function to add attendee to chat participants when they join an event
CREATE OR REPLACE FUNCTION public.add_attendee_to_chat_participants()
RETURNS TRIGGER AS $$
DECLARE
  event_chat_id UUID;
BEGIN
  -- Find the chat for this event (either direct event_id or linked_event_id for squad chats)
  SELECT id INTO event_chat_id FROM public.chats 
  WHERE event_id = NEW.event_id 
     OR linked_event_id = NEW.event_id
  LIMIT 1;
  
  -- If chat exists, add user to participants (ignore duplicates)
  IF event_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, profile_id)
    VALUES (event_chat_id, NEW.profile_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to run when an attendee joins an event
CREATE TRIGGER on_event_attendee_joined
AFTER INSERT ON public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION public.add_attendee_to_chat_participants();

-- Function to add existing attendees when a chat is created or linked to an event
CREATE OR REPLACE FUNCTION public.add_existing_attendees_to_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- When a chat is created/linked to an event, add all existing attendees
  IF NEW.event_id IS NOT NULL OR NEW.linked_event_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, profile_id)
    SELECT NEW.id, ea.profile_id
    FROM public.event_attendees ea
    WHERE ea.event_id = COALESCE(NEW.event_id, NEW.linked_event_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to run when a chat is created or linked
CREATE TRIGGER on_chat_created_or_linked
AFTER INSERT OR UPDATE OF event_id, linked_event_id ON public.chats
FOR EACH ROW
EXECUTE FUNCTION public.add_existing_attendees_to_chat();