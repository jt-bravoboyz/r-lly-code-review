-- Stealth After R@lly: host can hand-pick the crew
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS after_rally_stealth boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS after_rally_invited_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Helper: is the given profile invited to the (possibly stealth) After R@lly?
CREATE OR REPLACE FUNCTION public.is_after_rally_invited(_event_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    LEFT JOIN public.event_cohosts ec
      ON ec.event_id = e.id AND ec.profile_id = _profile_id
    WHERE e.id = _event_id
      AND (
        e.after_rally_stealth = false
        OR e.creator_id = _profile_id
        OR ec.id IS NOT NULL
        OR _profile_id = ANY(e.after_rally_invited_ids)
      )
  );
$$;