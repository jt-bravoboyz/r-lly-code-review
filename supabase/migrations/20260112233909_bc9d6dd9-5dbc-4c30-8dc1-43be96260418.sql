-- Phase 1 Gap Closure - Remaining Items

-- 1. Rename arrived_home to arrived_safely
ALTER TABLE public.event_attendees 
RENAME COLUMN arrived_home TO arrived_safely;

-- 2. Add participation confirmation column
ALTER TABLE public.event_attendees 
ADD COLUMN IF NOT EXISTS not_participating_rally_home_confirmed boolean DEFAULT NULL;

-- 3. Add DD drop-off confirmation columns
ALTER TABLE public.event_attendees 
ADD COLUMN IF NOT EXISTS dd_dropoff_confirmed_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.event_attendees 
ADD COLUMN IF NOT EXISTS dd_dropoff_confirmed_by uuid DEFAULT NULL;

-- 4. Add FK for dd_dropoff_confirmed_by to profiles(id)
ALTER TABLE public.event_attendees
ADD CONSTRAINT event_attendees_dd_dropoff_confirmed_by_fkey
FOREIGN KEY (dd_dropoff_confirmed_by) REFERENCES public.profiles(id);

-- 5. Add CHECK that dd_dropoff_confirmed_at requires going_home_at (participation)
ALTER TABLE public.event_attendees
ADD CONSTRAINT dd_dropoff_requires_participation 
CHECK (dd_dropoff_confirmed_at IS NULL OR going_home_at IS NOT NULL);

-- 6. Add CHECK that dd_dropoff_confirmed_by is NOT NULL when dd_dropoff_confirmed_at is set
ALTER TABLE public.event_attendees
ADD CONSTRAINT dd_dropoff_confirmed_by_required
CHECK (dd_dropoff_confirmed_at IS NULL OR dd_dropoff_confirmed_by IS NOT NULL);

-- 7. Unique partial index for event chats (chat_participants already has one)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event_chat 
ON public.chats (event_id) 
WHERE squad_id IS NULL AND event_id IS NOT NULL;

-- 8. Helper function: Check if attendee is undecided
CREATE OR REPLACE FUNCTION public.is_attendee_rally_home_undecided(
  p_event_id uuid,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees
    WHERE event_id = p_event_id
    AND profile_id = p_profile_id
    AND going_home_at IS NULL
    AND not_participating_rally_home_confirmed IS NULL
  );
$$;

-- 9. Helper function: Check if event safety is complete
CREATE OR REPLACE FUNCTION public.is_event_safety_complete(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.event_attendees
    WHERE event_id = p_event_id
    AND (
      (going_home_at IS NOT NULL 
       AND arrived_safely = false 
       AND dd_dropoff_confirmed_at IS NULL)
      OR
      (is_dd = true AND arrived_safely = false)
      OR
      (going_home_at IS NULL 
       AND not_participating_rally_home_confirmed IS NULL)
    )
  );
$$;

-- 10. Helper function: Check if attendee needs re-confirmation (After R@lly only)
CREATE OR REPLACE FUNCTION public.needs_rally_home_reconfirmation(
  p_event_id uuid,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = p_event_id
    AND ea.profile_id = p_profile_id
    AND ea.not_participating_rally_home_confirmed = true
    AND ea.going_home_at IS NULL
    AND ea.after_rally_opted_in = true
  );
$$;

-- 11. Event safety summary view
CREATE OR REPLACE VIEW public.event_safety_summary AS
SELECT 
  event_id,
  COUNT(*) as total_attendees,
  COUNT(*) FILTER (
    WHERE going_home_at IS NOT NULL 
    AND arrived_safely = false 
    AND dd_dropoff_confirmed_at IS NULL
  ) as participating_count,
  COUNT(*) FILTER (
    WHERE arrived_safely = true OR dd_dropoff_confirmed_at IS NOT NULL
  ) as arrived_safely_count,
  COUNT(*) FILTER (
    WHERE not_participating_rally_home_confirmed = true 
    AND going_home_at IS NULL
  ) as not_participating_count,
  COUNT(*) FILTER (
    WHERE going_home_at IS NULL 
    AND not_participating_rally_home_confirmed IS NULL
  ) as undecided_count,
  COUNT(*) FILTER (WHERE is_dd = true) as dd_count,
  COUNT(*) FILTER (
    WHERE is_dd = true AND arrived_safely = false
  ) as dd_pending_arrival_count,
  public.is_event_safety_complete(event_id) as safety_complete
FROM public.event_attendees
GROUP BY event_id;

-- 12. Update safe_event_attendees view to use arrived_safely
DROP VIEW IF EXISTS public.safe_event_attendees;
CREATE VIEW public.safe_event_attendees AS
SELECT 
  id,
  event_id,
  profile_id,
  status,
  share_location,
  CASE WHEN share_location = true THEN current_lat ELSE NULL END as current_lat,
  CASE WHEN share_location = true THEN current_lng ELSE NULL END as current_lng,
  CASE WHEN share_location = true THEN last_location_update ELSE NULL END as last_location_update,
  joined_at,
  going_home_at,
  CASE 
    WHEN destination_visibility = 'all' THEN destination_name
    ELSE NULL 
  END as destination_name,
  destination_visibility,
  arrived_at,
  arrived_safely,
  is_dd,
  not_participating_rally_home_confirmed,
  dd_dropoff_confirmed_at,
  dd_dropoff_confirmed_by
FROM public.event_attendees;

-- 13. Trigger: Create event chat on event creation
CREATE OR REPLACE FUNCTION public.create_event_chat_on_event_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chats (event_id, is_group, name)
  VALUES (NEW.id, true, NEW.title)
  ON CONFLICT (event_id) WHERE squad_id IS NULL DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_created_create_chat ON public.events;
CREATE TRIGGER on_event_created_create_chat
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.create_event_chat_on_event_create();

-- 14. Trigger: Sync chat participants with event attendees
CREATE OR REPLACE FUNCTION public.sync_chat_participants_on_attendee_change()
RETURNS TRIGGER AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  SELECT id INTO v_chat_id FROM public.chats 
  WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) 
  AND squad_id IS NULL
  LIMIT 1;
  
  IF v_chat_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.chat_participants (chat_id, profile_id)
    VALUES (v_chat_id, NEW.profile_id)
    ON CONFLICT (chat_id, profile_id) DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.chat_participants 
    WHERE chat_id = v_chat_id AND profile_id = OLD.profile_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_attendee_change_sync_chat ON public.event_attendees;
CREATE TRIGGER on_attendee_change_sync_chat
AFTER INSERT OR DELETE ON public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION public.sync_chat_participants_on_attendee_change();

-- 15. RLS cleanup: Drop redundant policies (if they exist)
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in chats they belong to" ON public.messages;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can view own event attendance" ON public.event_attendees;

-- 16. RLS: DD or host can confirm dropoff (drop first if exists to avoid duplicate)
DROP POLICY IF EXISTS "DD or host can confirm dropoff" ON public.event_attendees;
CREATE POLICY "DD or host can confirm dropoff"
ON public.event_attendees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.ride_passengers rp ON rp.ride_id = r.id
    JOIN public.profiles p ON p.id = r.driver_id
    WHERE rp.passenger_id = event_attendees.profile_id
    AND r.event_id = event_attendees.event_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE e.id = event_attendees.event_id
    AND (e.creator_id = p.id OR EXISTS (
      SELECT 1 FROM public.event_cohosts WHERE event_id = e.id AND profile_id = p.id
    ))
  )
);