Fix the two host-inclusion bugs in R@lly tab, then walk through the rest of the flow.

## Bug 1 — Itemized: host never gets to claim their items

**Root cause:** `supabase/functions/request-split-check/index.ts` (lines 166-172) inserts the host as a `split_check_targets` row with `status: 'paid'` and `share_cents: 0`. The claim UI (`ClaimItemsView` / `PaySplitShareDialog`) only opens for rows the user owes, so the host is locked out. Result: any item the host actually ate stays unclaimed and the math for everyone else is off.

**Fix:**
1. Edge function — when `mode === 'itemized'`, insert the host target with `status: 'pending'` (not paid) and `share_cents: 0`. They still owe themselves nothing in dollars, but the row exists so the claim UI mounts for them.
2. `SplitCheckHome` — also surface the host's own itemized request in "You Owe" *only when* there are unclaimed items left for them to claim (otherwise the host sees their own tab and gets confused). Easier alternative: add a small "Claim your items" entry on the "Owed to You" host card for itemized tabs that opens `ClaimItemsView` directly. I'll go with this — cleaner separation between "I host" and "I owe."
3. `compute_itemized_share` RPC — confirm it already handles the host as a participant; if it excludes the host from tax/tip headcount, update so host counts in the proportional split (the bill always covered the host).
4. When the host marks themselves done in the claim sheet, write `status='paid'` on their own row so it doesn't keep showing.

## Bug 2 — Quick: host not included in even split

**Root cause to verify:** standalone `StartTabDialog` already does N+1 ("X people including you") and the edge function divides by N+1. The likely-broken path is the event-side "Request Payment" entry (`SplitCheckSettlementPanel`) — need to read that file and confirm it (a) sends `mode: 'quick'` with the same N+1 expectation and (b) shows a preview that includes the host. If it sends `total_cents` over an attendee-only headcount, the per-person amount comes out higher than the host promised.

**Fix:**
1. Read `SplitCheckSettlementPanel` quick-split path and align the preview math + payload with the edge function's N+1 behavior.
2. Make the preview copy explicit everywhere: "$X / person · N people including you" so the host sees they're counted.
3. Edge function already inserts a paid host row at `quickShares[totalTargets]` — leave that as-is so the host's portion is recorded against the tab and the "collected" total in `SplitCheckHome` reflects reality (it currently excludes the host row via `t.profile_id !== r.host_id`, which is correct).

## Walkthrough plan (after the two fixes land)

Once these are in, I'll ping you to verify on Maya Maya (or a fresh test tab), then we move down the list together — Phase 3 (claim flow UX), Phase 4 (pay sheet + deep links), Phase 5 (guest pay), Phase 6 (host settlement panel) — fixing as we find issues instead of guessing.

## Files I'll touch

- `supabase/functions/request-split-check/index.ts` — host row status for itemized
- `src/pages/SplitCheckHome.tsx` — surface "Claim your items" on host's own itemized tab card
- `src/components/payments/ClaimItemsView.tsx` — allow host to open, mark-done writes `paid` on host row
- `src/components/events/SplitCheckSettlementPanel.tsx` — align quick-split preview + payload to include the host
- Possibly a tiny migration to update `compute_itemized_share` if it excludes the host from tax/tip proration

No schema changes expected beyond that one RPC tweak (if needed).