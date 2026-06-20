## Save & Submit button + nudge other attendees

### 1. "Submit my items" button (in `ClaimItemsView`)
Sticky primary action below the Live Summary:
- Label: **Submit my items · $X.XX** (uses `myTotalC`).
- Disabled with label "Pick at least one item" when `mySubtotalC === 0`.
- On press: success haptic → call new optional `onSubmit?.()` prop → also fire the nudge (step 2) for the host case.

Parents pass a close handler:
- `src/pages/SplitCheckHome.tsx` → `onSubmit={() => setClaimOpen(false)}` (sheet close already triggers `onChanged` refetch from the prior fix).
- `src/components/payments/PaySplitShareDialog.tsx` → if it embeds `ClaimItemsView`, wire `onSubmit` to its existing close path.

### 2. Notify other participants to claim their items
On submit, send an in-app + push nudge to every other participant on the tab who hasn't claimed anything yet.

**New edge function** `supabase/functions/nudge-claim-items/index.ts`:
- Auth: validate JWT (Lovable Cloud pattern), resolve caller's profile.
- Input: `{ request_id: string }`.
- Verify caller is host OR a target on this `split_check_requests` row.
- Compute recipients: every profile on `split_check_targets` for this request (status not `canceled`) PLUS the host, minus the caller, minus anyone who already has at least one row in `split_check_item_claims` for items belonging to this request.
- For each recipient, insert into `notifications`:
  - `type: 'tab_claim_nudge'`
  - `title: "{caller name} submitted their items"`
  - `body: "Claim what you ordered so the tab can settle."`
  - `data: { request_id, event_id }`
- Best-effort call to `send-push-notification` for each recipient (don't block on failure).
- Rate-limit via `check_rate_limit(profile_id, 'tab_claim_nudge', 1, 10)` per caller so spamming Submit doesn't blast a stream.

**Client wiring:** In `ClaimItemsView.onSubmit`, `await supabase.functions.invoke('nudge-claim-items', { body: { request_id: requestId } })` then call the parent close handler. Show a one-line toast: "Submitted · crew nudged."

### 3. Notification rendering
`tab_claim_nudge` will flow through the existing notifications page automatically (it reads all rows). Tapping the notification should deep-link to `/tabs` — handled by the generic tap-to-route fallback already in place; if not, add a route case for `tab_claim_nudge` → `/tabs` in the notifications list component (will confirm during implementation).

### Out of scope
- Re-nudge cool-down UI; the 10-minute rate limit handles abuse silently.
- SMS/email nudges; in-app + push only.