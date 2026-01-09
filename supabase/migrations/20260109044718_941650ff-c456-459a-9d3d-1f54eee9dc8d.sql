-- 1. Add bio field to profiles table
ALTER TABLE public.profiles ADD COLUMN bio text;

-- 2. Create co-hosts table for event co-host permissions
CREATE TABLE public.event_cohosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at timestamp with time zone DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id),
  UNIQUE(event_id, profile_id)
);

-- Enable RLS on event_cohosts
ALTER TABLE public.event_cohosts ENABLE ROW LEVEL SECURITY;

-- Co-hosts are visible to event attendees
CREATE POLICY "Attendees can view cohosts"
ON public.event_cohosts
FOR SELECT
USING (true);

-- Event creators can add cohosts
CREATE POLICY "Creators can add cohosts"
ON public.event_cohosts
FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Event creators can remove cohosts
CREATE POLICY "Creators can remove cohosts"
ON public.event_cohosts
FOR DELETE
USING (
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- 3. Update events RLS to allow cohosts to update events
DROP POLICY IF EXISTS "Creators can update events" ON public.events;
CREATE POLICY "Creators and cohosts can update events"
ON public.events
FOR UPDATE
USING (
  creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR id IN (
    SELECT event_id FROM event_cohosts 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 4. Update barhop_stops RLS to allow cohosts to manage stops
DROP POLICY IF EXISTS "Event creators can manage stops" ON public.barhop_stops;
CREATE POLICY "Event creators and cohosts can manage stops"
ON public.barhop_stops
FOR ALL
USING (
  event_id IN (
    SELECT id FROM events 
    WHERE creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  OR event_id IN (
    SELECT event_id FROM event_cohosts 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- 5. Enable realtime for event_cohosts
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_cohosts;