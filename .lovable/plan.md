## Problem

Squad invitees see **two** identical alerts in their Alerts tab for a single invite. Two `AFTER INSERT` triggers exist on `public.squad_invites`, both invoking the same `notify_on_squad_invite()` function:

- `trg_notify_squad_invite` — created in migration `20260329225922`, redefined in `20260329231511`
- `trg_notify_on_squad_invite` — created later in `20260329235547` (a rename that never dropped the original)

Each insert into `squad_invites` therefore inserts two rows into `notifications` with `type = 'squad_invite'` for the same recipient.

## Fix

One migration that drops the duplicate trigger and keeps the canonical one:

```sql
-- Remove the duplicate squad-invite notification trigger.
-- Keep trg_notify_on_squad_invite (the newer, current name); drop the old one.
DROP TRIGGER IF EXISTS trg_notify_squad_invite ON public.squad_invites;
```

No changes to:
- `notify_on_squad_invite()` function (still correct)
- Client code (no client-side notification insert exists for squad invites)
- `send-event-notification` edge function (only fires push, doesn't write to `notifications` for this type)

## Verification

After the migration, sending a new squad invite should produce exactly one row in `public.notifications` for the recipient and one card in the Alerts tab. Existing duplicate notifications already in users' inboxes are left in place (not retroactively cleaned up) — let me know if you want a one-shot cleanup query as well.

## Out of scope

- Push-notification de-dup (separate codepath, already keyed).
- Changing invite copy/UI.
