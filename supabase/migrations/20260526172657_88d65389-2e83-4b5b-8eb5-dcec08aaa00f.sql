
CREATE OR REPLACE FUNCTION public.is_event_creator(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.profiles p ON p.id = e.creator_id
    WHERE e.id = _event_id AND p.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_pending_or_accepted_invite(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_invites i
    JOIN public.profiles p ON p.id = i.invited_profile_id
    WHERE i.event_id = _event_id
      AND p.user_id = _user_id
      AND i.status IN ('pending','accepted')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_event_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_or_accepted_invite(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Members, invitees, and admins can view events" ON public.events;
CREATE POLICY "Members, invitees, and admins can view events"
ON public.events
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.is_event_creator(id, auth.uid())
  OR public.is_event_host_or_cohost(id, auth.uid())
  OR public.is_event_member(id)
  OR public.has_pending_or_accepted_invite(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view their own invites" ON public.event_invites;
CREATE POLICY "Users can view their own invites"
ON public.event_invites
FOR SELECT
USING (
  invited_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR invited_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_event_creator(event_id, auth.uid())
);
