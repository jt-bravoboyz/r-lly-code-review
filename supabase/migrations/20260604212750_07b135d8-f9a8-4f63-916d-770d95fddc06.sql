
CREATE TABLE IF NOT EXISTS public.event_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  squad_id uuid NOT NULL,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, squad_id)
);

GRANT SELECT, INSERT, DELETE ON public.event_squads TO authenticated;
GRANT ALL ON public.event_squads TO service_role;

ALTER TABLE public.event_squads ENABLE ROW LEVEL SECURITY;

-- Event members and squad members can view associations
CREATE POLICY "View event_squads if event member or squad member"
ON public.event_squads
FOR SELECT
TO authenticated
USING (
  is_event_member(event_id)
  OR EXISTS (
    SELECT 1 FROM public.squads s
    WHERE s.id = event_squads.squad_id
      AND s.owner_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.squad_members sm
    WHERE sm.squad_id = event_squads.squad_id
      AND sm.profile_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  )
);

-- Event hosts/cohosts can tag squads
CREATE POLICY "Hosts can attach squads to events"
ON public.event_squads
FOR INSERT
TO authenticated
WITH CHECK (
  is_event_host_or_cohost(event_id, auth.uid())
);

-- Event hosts/cohosts can remove squad tags
CREATE POLICY "Hosts can detach squads from events"
ON public.event_squads
FOR DELETE
TO authenticated
USING (
  is_event_host_or_cohost(event_id, auth.uid())
);

CREATE INDEX IF NOT EXISTS event_squads_squad_id_idx ON public.event_squads (squad_id);
CREATE INDEX IF NOT EXISTS event_squads_event_id_idx ON public.event_squads (event_id);
