## Goal

Make Split-Check a first-class, always-on capability on every R@lly, and finally hook up the attendee side of the flow so unpaid shares are impossible to miss.

---

## 1. Remove the creation toggle

**File:** `src/components/events/CreateEventDialog.tsx`

- Delete the "Split Check" Switch block (lines ~535–543).
- In the form's default values / schema, force `split_check: true` so every newly created event ships with splits enabled.
- Leave the existing DB column alone; existing `false` rows will be ignored by the new always-on UI.

## 2. Remove the time gate on the host card

**File:** `src/pages/EventDetail.tsx` (lines ~885–923)

- Today the Split-Check card only renders inside the `!isCompleted && isAfterRally` branch.
- Lift the host-only `<Card className="card-rally">…SplitCheckSettlementPanel…</Card>` block out of that branch and render it whenever `canManage && !isCompleted` (so hosts and co-hosts see it before, during, and after the R@lly, but it disappears once the event is fully completed/archived).
- Keep the "Request Payment" button + `RequestPaymentDialog` exactly as wired (`setShowRequestPayment(true)`).
- The Safety/After-R@lly block stays untouched in its current branch.

## 3. Wire the attendee Pay-Your-Share flow (the real fix)

This is the missing piece — `PaySplitShareDialog` exists but is never mounted. We add three small things:

### 3a. A hook that finds the viewer's unpaid share for an event

**New file:** `src/hooks/useMyUnpaidSplit.tsx`

- Input: `eventId`, `profileId`.
- Queries `split_check_requests` for the event, joins `split_check_targets` where `profile_id = me` and `status = 'pending'`.
- Subscribes to the same realtime channel pattern as `useSplitCheck` (`split-check-${eventId}`) so the CTA disappears the instant the row flips to `paid`.
- Returns `{ unpaid: Array<{ requestId, mode, amountCents }>, total, refetch }`.

### 3b. "Pay Your Share" CTA on `EventDetail.tsx`

- For non-host attendees, render a prominent orange CTA card directly under the hero action bar whenever `useMyUnpaidSplit` returns at least one unpaid row:
  - Headline: `"Your tab: $XX.XX"`
  - Sub: `"N share${>1?'s':''} waiting"` (or `"Tap to claim your items"` when any unpaid row is `itemized`).
  - Tapping the card opens `PaySplitShareDialog` with the oldest unpaid `requestId`. If multiple are open, the dialog cycles to the next one via `onPaid`.
- State: `const [payRequestId, setPayRequestId] = useState<string | null>(null);` + mount `<PaySplitShareDialog open={!!payRequestId} … />` alongside the other event dialogs (~line 1376).
- Pass `savedToken / savedCardLast4 / savedCardBrand` from the existing `useMerchantAccount` / saved-card profile lookup (same source `CoverChargeDialog` uses).

### 3c. Notification card deep link

**File:** `src/pages/Notifications.tsx`

- In `handleNotificationClick`, add a branch for `type === 'split_check_request'` that navigates to `/events/${data.event_id}?pay=${data.request_id}`.
- In `EventDetail.tsx`, read the `pay` search param on mount and call `setPayRequestId(payParam)` so the dialog auto-opens. Strip the param after open (same pattern used for `?rogue=`).
- Optional polish: in the notification list, append a small "Pay $X.XX" pill button on `split_check_request` rows for a one-tap path that bypasses the event page (calls `setPayRequestId` only if you preload context — easiest is to just route to the deep-link URL above).

## 4. Walkthrough I will deliver after these edits ship

Once Steps 1–3 are merged I will:

1. Set `localStorage.rally.simulatePayments=true` in preview so no real card is needed.
2. Capture and post six labeled screenshots inline, with the tap-path under each, so you can replay the flow:
   - Create R@lly dialog (toggle gone, splits implicit).
   - Event page as host (Split-Check card visible before After R@lly).
   - Request Payment → Quick Split tab filled in.
   - Request Payment → Itemized tab with parsed receipt.
   - Settlement panel mid-flight (paid + pending + nudge bell).
   - Attendee view of same event with the new "Your tab" CTA → `PaySplitShareDialog` open → simulated paid confirmation.
3. Confirm the notification deep link by tapping a `split_check_request` row in `/notifications` and verifying the dialog auto-opens with the right amount.

---

## Files touched

- `src/components/events/CreateEventDialog.tsx` — remove toggle, force default.
- `src/pages/EventDetail.tsx` — un-gate host card, mount `PaySplitShareDialog`, render attendee CTA, handle `?pay=` param.
- `src/pages/Notifications.tsx` — route `split_check_request` to `/events/:id?pay=:requestId`.
- `src/hooks/useMyUnpaidSplit.tsx` — **new** hook.

## Out of scope

- No DB migration. `events.split_check` stays as-is; we just stop reading it from the UI gates.
- No edits to `request-split-check`, `process-fluid-pay`, or `PaySplitShareDialog` internals — they're already production-hardened from the previous pass.
- Founder/host payout onboarding (`PayoutSettingsSection`) is unchanged; the existing in-panel "Set up payouts" amber prompt still fires when needed.
