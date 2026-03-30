

# Fix: Squad invite `in_app` type rejected by database constraint

## Problem
The `squad_invites` table has a check constraint that only allows `invite_type` values of `'email'` or `'sms'`. The in-app invite code sends `'in_app'`, which the database rejects.

## Solution
Update the check constraint to also allow `'in_app'` as a valid invite type.

### Database migration
```sql
ALTER TABLE public.squad_invites DROP CONSTRAINT squad_invites_invite_type_check;
ALTER TABLE public.squad_invites ADD CONSTRAINT squad_invites_invite_type_check 
  CHECK (invite_type = ANY (ARRAY['email', 'sms', 'in_app']));
```

No code changes needed — the frontend already sends the correct `'in_app'` value. The trigger `notify_on_squad_invite` already handles the `'in_app'` type with `profile:` prefix matching.

