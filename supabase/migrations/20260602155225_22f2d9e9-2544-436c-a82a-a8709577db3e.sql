CREATE TABLE public.rally_home_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rally_home_sessions TO authenticated;
GRANT ALL ON public.rally_home_sessions TO service_role;

ALTER TABLE public.rally_home_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_members_select_sessions" ON public.rally_home_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      JOIN public.profiles p ON p.id = sm.profile_id
      WHERE sm.squad_id = rally_home_sessions.squad_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.squads s
      JOIN public.profiles p ON p.id = s.owner_id
      WHERE s.id = rally_home_sessions.squad_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "squad_members_insert_sessions" ON public.rally_home_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.squad_members sm
      JOIN public.profiles p ON p.id = sm.profile_id
      WHERE sm.squad_id = rally_home_sessions.squad_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.squads s
      JOIN public.profiles p ON p.id = s.owner_id
      WHERE s.id = rally_home_sessions.squad_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "creator_update_session" ON public.rally_home_sessions FOR UPDATE
  USING (created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX rally_home_sessions_squad_active
  ON public.rally_home_sessions(squad_id, status) WHERE status = 'active';

CREATE TABLE public.rally_home_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.rally_home_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  opted_out boolean NOT NULL DEFAULT false,
  destination_name text,
  destination_lat float8,
  destination_lng float8,
  going_home_at timestamptz,
  arrived_safely boolean NOT NULL DEFAULT false,
  arrived_at timestamptz,
  is_dd boolean NOT NULL DEFAULT false,
  needs_ride boolean NOT NULL DEFAULT false,
  not_participating_confirmed boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rally_home_participants TO authenticated;
GRANT ALL ON public.rally_home_participants TO service_role;

ALTER TABLE public.rally_home_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_members_select_participants" ON public.rally_home_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rally_home_sessions s
      LEFT JOIN public.squad_members sm ON sm.squad_id = s.squad_id
      LEFT JOIN public.squads sq ON sq.id = s.squad_id
      JOIN public.profiles p ON (p.id = sm.profile_id OR p.id = sq.owner_id)
      WHERE s.id = rally_home_participants.session_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_participants" ON public.rally_home_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rally_home_sessions s
      LEFT JOIN public.squad_members sm ON sm.squad_id = s.squad_id
      LEFT JOIN public.squads sq ON sq.id = s.squad_id
      JOIN public.profiles p ON (p.id = sm.profile_id OR p.id = sq.owner_id)
      WHERE s.id = rally_home_participants.session_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_participant_row" ON public.rally_home_participants FOR UPDATE
  USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX rally_home_participants_session
  ON public.rally_home_participants(session_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rally_home_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rally_home_sessions;