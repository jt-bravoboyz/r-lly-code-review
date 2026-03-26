

# Security Fixes — 4 Findings

## Finding 1: `event_safety_summary` view has no RLS

The view uses `security_invoker = true` so it inherits caller's permissions on `event_attendees`. However, the view itself has no RLS enabled, which some configurations may allow bypass. Fix: enable RLS on the view and add a SELECT policy for authenticated event members.

```sql
ALTER VIEW public.event_safety_summary SET (security_invoker = true);
ALTER TABLE public.event_safety_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event members can view safety summary"
ON public.event_safety_summary
FOR SELECT
TO authenticated
USING (
  public.is_event_member(event_id)
);
```

## Finding 2: `is_valid_squad_invite` has no user-specific check

Currently any authenticated user who hits a squad with ANY active invite can view/join it. The function only checks invite existence, not whether the invite targets the caller.

However, the squad invite system uses shareable invite codes (not user-targeted invites) — anyone with the code should be able to join. The real issue is the squads SELECT policy lets users browse squads without knowing the code.

Fix: Replace the `is_valid_squad_invite`-based squads SELECT policy with one that checks squad membership/ownership only. The join flow already works through the `JoinSquad` page which queries `squad_invites` directly by code.

```sql
DROP POLICY IF EXISTS "Authenticated users can view squads via valid invite"
ON public.squads;

-- Squad visibility: members, owners, or users who share an event
-- The join page uses squad_invites table directly (doesn't need squads SELECT via invite)
CREATE POLICY "Members and owners can view squads"
ON public.squads
FOR SELECT
TO authenticated
USING (
  public.is_squad_member_or_owner(id)
);
```

The `JoinSquad` page fetches invite details from `squad_invites` (which includes squad name via join), so removing the squads-via-invite policy won't break the join flow.

## Finding 3: `event_cohosts` SELECT uses `USING (true)` — public access

Fix: Restrict to authenticated event members.

```sql
DROP POLICY "Attendees can view cohosts" ON public.event_cohosts;

CREATE POLICY "Event members can view cohosts"
ON public.event_cohosts
FOR SELECT
TO authenticated
USING (
  public.is_event_member(event_id)
);
```

## Finding 4: Capacitor CLI tar vulnerability still flagged

The `package.json` already shows `^8.0.1`. The scanner may be using a cached lockfile. Fix: no action needed beyond confirming the lockfile resolved to 8.0.1+. If still flagged, will check if `bun.lock` needs regeneration.

## Impact

- No code changes needed — all fixes are database-level policy changes
- `JoinSquad` page verified: it queries `squad_invites` directly by code, doesn't need squads SELECT via invite policy
- `useCohosts` hook queries `event_cohosts` with authenticated users who are event members — compatible with new policy
- Three SQL migrations, zero frontend changes

