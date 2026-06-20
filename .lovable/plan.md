## Add "Share with everyone" to itemized claim view

Right now each item in `ClaimItemsView` only supports per-person +/- claiming. Shared things (appetizers, a pitcher, the table's fries) force one person to eat the whole cost or for everyone to manually +1. Add a one-tap way to split a single item evenly across all people on the tab.

### UX
Per item row, add a small pill button next to the +/- controls:
- Label: **Share with all** (icon: `Users`)
- When active: pill turns primary-tinted, label becomes **Shared · N people**, tapping again clears the share.
- Avatar stack already shows everyone who claimed — sharing populates it with all participants.
- Live summary at the bottom updates instantly (existing math already handles it — each person's qty / totalClaimed prorates the line).

### Behavior
"All people" = the host + every row in `split_check_targets` for this `request_id` (status not `canceled`).

Tapping **Share with all**:
1. Delete any existing claims on that item.
2. Insert one claim row per participant with `quantity_claimed = 1`. Even split falls out of the existing prorate formula (`lineTotal * mine/totalClaimed`).
3. Mark the item locally as "shared" so the pill renders active. Detect shared state on load by: all participants present with qty 1 and count equals participant count.

Tapping again while active: delete all claims on that item (reset to unclaimed).

If someone later +/- on a shared item, it just adjusts their qty — share pill auto-deactivates since the equal-split signature no longer matches. That's fine; no extra confirmation.

### Files
- `src/components/payments/ClaimItemsView.tsx` — fetch participants once (host from `split_check_requests.created_by` + targets from `split_check_targets`), add `shareAll(itemId)` handler, render the pill, compute `isSharedAll` per item.

No schema changes, no edge function changes, no impact on Quick mode.

### Out of scope
- Splitting an item between a *subset* of people (would need a picker — flag for later if you want it).
- Fractional quantities / weights.