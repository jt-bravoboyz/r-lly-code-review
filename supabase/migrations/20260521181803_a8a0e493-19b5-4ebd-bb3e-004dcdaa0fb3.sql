
-- Reassign event to correct Alessandra profile and fix attendee list
UPDATE public.events
SET creator_id = '595a61a2-113d-4abc-ad46-fbc226834813'
WHERE id = '85f74226-08ad-46d4-8d71-df42ef0eb143';

DELETE FROM public.event_attendees
WHERE event_id = '85f74226-08ad-46d4-8d71-df42ef0eb143';

INSERT INTO public.event_attendees (event_id, profile_id, status)
VALUES ('85f74226-08ad-46d4-8d71-df42ef0eb143', '595a61a2-113d-4abc-ad46-fbc226834813', 'attending');

-- Ensure she's in the event chat too
INSERT INTO public.chat_participants (chat_id, profile_id)
SELECT c.id, '595a61a2-113d-4abc-ad46-fbc226834813'
FROM public.chats c
WHERE c.event_id = '85f74226-08ad-46d4-8d71-df42ef0eb143'
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = c.id AND cp.profile_id = '595a61a2-113d-4abc-ad46-fbc226834813'
  );

DELETE FROM public.chat_participants cp
USING public.chats c
WHERE cp.chat_id = c.id
  AND c.event_id = '85f74226-08ad-46d4-8d71-df42ef0eb143'
  AND cp.profile_id = '536e4694-245b-48d8-9930-018d72f266e0';
