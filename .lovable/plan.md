# Split Check — Final Polish Pass

Three focused improvements. No business-logic changes; UX + one server guard.

---

## 1. Itemized Amount Mutation Warning (PaySplitShareDialog.tsx)

**Goal:** Turn server's `409 claim_snapshot_mismatch` into a clear in-flow recovery moment.

- In `pay()`, inspect the edge function response. When `data.error === "claim_snapshot_mismatch"`, do not toast — instead:
  - Update local `computedTotal` to `data.server_total_cents`.
  - Open a small inline `AlertDialog` ("Your tab just changed") showing:
    - "Someone at the table just updated their claims."
    - Old amount → New amount (with arrow, tabular-nums, R@lly Orange on the new value).
    - Two actions: **Re-verify & pay** (closes alert, refreshes `refreshItemized()`, leaves payer ready to tap Pay again) and **Cancel** (dismisses).
- Also re-trigger `refreshItemized()` immediately so the big amount tile reflects the new total in real time.
- Keep existing generic-error toast as the fallback for any other error code.

## 2. Nudge Cooldown (supabase/functions/nudge-split-share/index.ts)

**Goal:** 5-minute hard cap per target per request.

- After resolving `req_row` + auth, query existing `split_check_targets` for the supplied `(request_id, target_profile_ids)` and read `last_nudged_at`.
- Partition into:
  - `allowed` — `last_nudged_at` is null or older than 5 minutes ago.
  - `cooling` — still inside the window. Capture each one's `seconds_remaining`.
- If `allowed.length === 0`: return `429 nudge_cooldown` with `{ cooling: [{profile_id, seconds_remaining}] }` so the client can surface a clean message.
- Otherwise, run the existing notification + push fan-out **only** against `allowed`, and update `last_nudged_at = now()` only on those rows.
- Response payload: `{ ok: true, nudged: allowed.length, skipped: cooling.length, cooling }`.
- `SplitCheckSettlementPanel.tsx` nudge handlers stay mostly unchanged; just upgrade the toast:
  - `nudged > 0` → `toast.success` (e.g. "Nudged 1" or "Nudged 3, skipped 2 (recently nudged)")
  - All cooling → `toast.error("Cool down — try again in {Math.ceil(maxSecs/60)} min")`.

## 3. Replace `window.confirm` with `<AlertDialog>` (brand polish)

Two confirm() callsites to swap:

**SplitCheckSettlementPanel.tsx — Cancel request**
- Replace `confirm('Cancel this split-check request?...')` with an `AlertDialog`:
  - Title: "Cancel this split-check?"
  - Description: "Pending attendees will stop seeing the pay prompt. Already-paid shares stay collected."
  - Actions: **Keep it open** (secondary) / **Cancel request** (destructive).
- Track open state per-request id (single `cancelTargetId` state is enough since only one alert is open at a time).

**PaySplitShareDialog.tsx — Decline tab**
- Replace `confirm('Decline this tab?...')` with an `AlertDialog`:
  - Title: "Decline this tab?"
  - Description: "The host will be notified you opted out. You can't undo this."
  - Actions: **Keep paying** / **Decline** (destructive).

Both use shadcn's `AlertDialog` (`@/components/ui/alert-dialog`) so they inherit the Glass/Liquid + Montserrat language automatically.

---

## Files touched

```text
supabase/functions/nudge-split-share/index.ts   (cooldown logic + new response shape)
src/components/payments/PaySplitShareDialog.tsx (409 handler + AlertDialog for decline)
src/components/events/SplitCheckSettlementPanel.tsx (AlertDialog for cancel + cooldown toast)
```

No database migration needed — `last_nudged_at` already exists and is being written by the current code path.
