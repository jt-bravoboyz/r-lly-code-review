-- Drop the wide-open SELECT policy and replace with a stealth-aware one
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

CREATE POLICY "Authenticated users can view events"
ON public.events
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Non-stealth events: visible to everyone authenticated (existing behavior)
    COALESCE(after_rally_stealth, false) = false
    -- Stealth ON but not yet in after_rally phase: still visible (parent R@lly is normal)
    OR status <> 'after_rally'
    -- Stealth + after_rally: only host, co-hosts, or invited profiles
    OR public.is_after_rally_invited(
        id,
        (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
       )
  )
);