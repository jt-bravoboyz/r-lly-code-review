
# Fix squad invites so they actually appear in Alerts

## What I found
The issue is not just UI. The invite pipeline is breaking before an Alerts card can exist.

### Root causes
1. **No `squad_invite` notification rows are being created**
   - I checked the database: there are recent `squad_invites` rows, but **zero** `notifications` rows of type `squad_invite`.
   - That directly explains why nothing shows in the Alerts tab.

2. **Client-side notification insert is blocked by RLS**
   - `SquadInviteDialog.tsx` tries to insert into `notifications` for the invited person.
   - Current policy only allows inserting notifications where `profile_id` is **your own** profile.
   - So an inviter cannot create a notification for someone else from the client.

3. **Edge function currently skips Alerts storage when push subscriptions don’t exist**
   - In `send-event-notification`, the function checks push subscriptions first and returns `"No push subscriptions"` early.
   - Because of that early return, users without push setup get **no database notification**, so nothing lands in Alerts.

4. **Phone matching is too brittle**
   - `SquadInviteDialog.tsx` uses `.eq('phone', contactValue)`.
   - If the stored phone has formatting differences (`+1`, spaces, parentheses, etc.), no match is found.
   - I also checked the current data for `4042427500` and did not find a matching profile row under exact/normalized lookup from the data I queried.

## Implementation plan

### 1. Move squad invite alert creation fully to the backend function
Update `supabase/functions/send-event-notification/index.ts` so `squad_invite` can:
- accept `contactValue` and `contactType`
- resolve the target profile server-side
- create the `notifications` row server-side using service-level access

This avoids the client-side RLS failure entirely.

### 2. Make Alerts persistence independent from push delivery
Refactor `send-event-notification` so it:
- determines recipient profile IDs
- inserts `notifications` rows first
- only then attempts push delivery if subscriptions exist

Important behavior:
- **No push subscription must not prevent Alerts-tab notifications**
- if push fails, the in-app alert still exists

### 3. Improve squad invite recipient matching
For `squad_invite`, add server-side matching logic:
- normalize phone numbers to digits and match by last 10 digits
- support email-based matching via backend user lookup if possible
- skip gracefully only when no account can be matched

This makes invites much more reliable.

### 4. Simplify `SquadInviteDialog.tsx`
Change the dialog so after creating a `squad_invites` row it:
- no longer inserts `notifications` directly from the client
- calls the notification function with squad metadata + contact info
- keeps existing SMS/email/share UI unchanged

### 5. Preserve the existing Alerts UI
`Notifications.tsx`, `InviteAlertCard.tsx`, and realtime notifications already support invite cards once rows exist.
So no redesign is needed there unless a small fallback tweak is required.

## Expected result
After this fix:
- squad invite creates an Alerts entry even when push is off or unavailable
- the invite appears in the Alerts tab immediately
- the Accept/Decline invite card becomes usable
- push becomes optional enhancement, not a dependency

## Files to update
- `supabase/functions/send-event-notification/index.ts`
- `src/components/squads/SquadInviteDialog.tsx`

## Notes
I do **not** recommend loosening the `notifications` insert policy to let clients write alerts for other users. The safer fix is to keep cross-user notification creation on the backend.
