## Problem
When the invite is accepted from **PendingInvites** ("I'm In!") or the **RallyInviteBanner** onboarding popup, the server returns `{ error: 'cover_required', status: 'payment_required' }`. Today both components silently swallow that, fire the success toast and (for PendingInvites) navigate to the event — leaving the user stranded with no way to actually pay. The toast at the bottom of the screen reading `cover_required` is the raw server error leaking through.

The `CoverChargeDialog` is currently only wired to the **JOIN** button on `EventDetail`, not to invite-accept buttons.

## Fix
Reuse the existing `useCoverChargeGate(event, profile)` hook in the two invite-accept entry points so the payment dialog opens *before* the invite is marked accepted.

### 1. `src/components/events/PendingInvites.tsx`
- For each invite, build a lightweight `EventLike` object from `invite.event` (already has `id`, `title`, `cover_charge`).
- Wrap the card in a small subcomponent (e.g. `PendingInviteCard`) so each invite gets its own `useCoverChargeGate` instance and its own rendered `dialog`.
- In `handleRespond('accepted')`:
  1. `await ensurePaid()` — bail silently if user dismisses.
  2. Then `respondToInvite.mutateAsync(...)` as today.
  3. On success show "You're in!" + navigate.
- Render `{coverDialog}` inside the card.
- Remove the dependency on the swallowed `payment_required` early-return (still safe to leave in the hook as defense-in-depth).

### 2. `src/components/onboarding/RallyInviteBanner.tsx`
- Same pattern: pass `state.invite.event` + `profile` to `useCoverChargeGate`.
- In `handleAccept`, call `await ensurePaid()` first; if false, just reset `isResponding` and return.
- Then run the existing `respondToInvite.mutateAsync(...)` flow.
- Render `{coverDialog}` near the bottom of the banner (above the action buttons).

### 3. Defense-in-depth tidy-up — `src/hooks/useEventInvites.tsx`
- When `result?.status === 'payment_required'` is returned (someone bypasses the gate), throw a friendly `Error('A cover charge is required for this event.')` instead of returning silently. That way the toast no longer reads `cover_required` if a future caller forgets to gate.
- Update `PendingInvites` / `RallyInviteBanner` to special-case this error and navigate to `/events/:eventId` so the user lands on the dialog-equipped page.

## Out of scope
- No changes to the `request_join_event` SQL function — server-side gate is already correct.
- No redesign of `CoverChargeDialog` itself.
- No changes to invite list queries (cover_charge already comes back via the embedded `event:events(...)` selector — confirm during impl, add to select if missing).

## Result
Sko (or any new invitee) taps **I'm In!** on the invite card → `CoverChargeDialog` slides up → enters card → payment succeeds → invite flips to accepted → joins event. No more naked `cover_required` toast.