## Goal
Surface the same "what's claimed vs. still unclaimed" intelligence on the **host's tab card** in `/tabs` — the collapsible card showing the event total, "$X in · $Y open", and per-person rows (Jenna, Ryan, etc.) — so a host can see at a glance how much of the bill the crew has actually picked up and how much each attendee has currently claimed.

## Changes — `src/pages/SplitCheckHome.tsx` (`OwedRequestCard` only)

### 1. New lightweight claim summary loader
Inside `OwedRequestCard`, when `isItemized && open` (collapsed cards stay cheap):
- Fetch `split_check_items` for `request_id` and `split_check_item_claims` for those item ids (one-shot + realtime subscription on `split_check_item_claims` filtered to this request's items).
- Compute:
  - `grandSubtotalC` — Σ `unit_price_cents * quantity`
  - `claimedSubtotalC` — Σ per item `lineTotal * min(totalClaimed, qty) / qty`
  - `unclaimedSubtotalC = grandSubtotalC - claimedSubtotalC`
  - `perPersonClaimedC: Record<profile_id, cents>` — for each item with claimants, distribute `lineTotal` proportionally by each claimer's `qty / totalClaimed`.

No schema changes, no new RPC.

### 2. New "Bill status" strip inside `CollapsibleContent`
Render above the "Claim your items" button (itemized only) when `grandSubtotalC > 0`:

```text
BILL STATUS                        of $TOTAL
Claimed              $XX.XX  (primary)
Unclaimed            $XX.XX  (amber) — or green "All claimed" pill when 0
```
Same visual treatment as the strip already added to `ClaimItemsView` so the two views feel consistent.

### 3. Enrich per-target rows with "claimed" amount
For each target row (Jenna, Ryan, …) on itemized requests:
- Replace the single `share_cents` number with a two-line micro-stat:
  - **Top:** `fmtUSD(perPersonClaimedC[profile_id] ?? 0)` labeled "claimed" (muted)
  - **Bottom:** existing `share_cents` as "owes" when settlement has run, otherwise hidden
- Keep the status badge (Pending / Sent / Paid / Disputed) untouched on the right.
- For non-itemized requests, the row stays exactly as it is today (just `share_cents` + badge).

### 4. Keep header line truthful
Leave the header `$X in · $Y open` and big total as-is — they already reflect collected/pending in dollars. No math change there.

## Out of scope
- No edits to `ClaimItemsView`, edge functions, or DB.
- No change to non-itemized tab cards.
- No change to settlement, payment, or notification flows.
