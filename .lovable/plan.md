## Goal
Reset Sko on **RIP ALTAR BOYZ** so he has to re-join through the cover-charge gate.

## Steps

1. **Remove Sko's attendance**
   - Delete `event_attendees` row `bbfda1dd-e0e6-4a4e-8910-6874d07874f2`
     (event `644eeedf…`, profile `82901a4c…` / Sko).

2. **Clean up any prior payment record** (so the anti-double-charge check doesn't auto-skip the dialog)
   - Delete from `payments` where `event_id = 644eeedf…`, `user_id = 8e66c7bd…` (Sko's auth user), `kind = 'cover'`.
   - In practice none exist (he was grandfathered), but we'll guard for it.

3. **Re-invite Sko**
   - Insert into `event_invites`: `event_id = 644eeedf…`, `invited_profile_id = 82901a4c…`, `invited_by = 536e4694…` (host), `status = 'pending'`.
   - This surfaces an in-app invite Sko can accept, which routes through the new `useCoverChargeGate` flow and forces the $5 `CoverChargeDialog`.

## Result
Sko will see a new invite to RIP ALTAR BOYZ. Tapping Accept (or opening the event) triggers the cover-charge payment dialog before the join completes.

## Out of scope
- No code changes — purely data ops via the insert tool.
- Other attendees remain untouched.