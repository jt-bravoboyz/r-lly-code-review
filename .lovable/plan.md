

# Fix Squad Security Findings

Two database migrations to restrict unauthenticated access.

## Migration 1: Fix `squad_invites` SELECT policy

Drop the current `"Anyone can view pending invites"` policy and replace it with one scoped to `{authenticated}` that also restricts visibility to squad members/owners or the invite creator:

```sql
DROP POLICY "Anyone can view pending invites" ON public.squad_invites;

CREATE POLICY "Authenticated users can view pending invites"
ON public.squad_invites
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
);
```

This prevents unauthenticated users from harvesting phone numbers while preserving the join flow (JoinSquad page already requires auth).

## Migration 2: Fix `squads` SELECT invite policy

Drop and recreate scoped to `authenticated`:

```sql
DROP POLICY "Anyone can view squads via valid invite" ON public.squads;

CREATE POLICY "Authenticated users can view squads via valid invite"
ON public.squads
FOR SELECT
TO authenticated
USING (
  public.is_valid_squad_invite(id)
);
```

## Impact

- **No code changes needed** — JoinSquad page already redirects unauthenticated users to login
- Both policies simply add `TO authenticated`, closing the unauthenticated access gap
- All existing squad invite/join flows remain functional

