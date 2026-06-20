## Goal
On the claim breakdown ("Live Summary" in the claim sheet), surface two new at-a-glance numbers so the user always knows:
1. **Your claimed subtotal** (already shown, will be relabeled for clarity)
2. **Remaining unclaimed on the bill** — how much of the full check no one has picked up yet

## Changes — `src/components/payments/ClaimItemsView.tsx` only

### 1. Compute unclaimed total
In the existing `useMemo` that derives `mySubtotalC` / `grandSubtotalC`, also compute:
- `claimedSubtotalC` — sum over items of `min(totalClaimed, qty) / qty * lineTotal` (the portion of each line that has at least one claimer; fully-claimed lines count fully, partially-claimed lines count proportionally, untouched lines count 0).
- `unclaimedSubtotalC = grandSubtotalC - claimedSubtotalC`.

### 2. Add a "Bill status" block to the sticky Live Summary
Right above the existing "Your items subtotal" row, insert a compact two-row group with a subtle divider:

```text
Bill status
You've claimed             $XX.XX  ← mySubtotalC, primary color when > 0
Still unclaimed            $XX.XX  ← unclaimedSubtotalC, amber/warning when > 0, muted "$0.00 · all set" when 0
```

When `unclaimedSubtotalC === 0` and `grandSubtotalC > 0`, show a small success pill ("All items claimed") instead of the dollar amount so the crew knows the tab is fully covered.

### 3. Keep existing rows intact
"Your share of tax", "Tip (split evenly …)", "Estimated final charge", and the Submit button stay exactly as they are — only the new two-row "Bill status" block is added at the top of Live Summary.

## Out of scope
- No schema changes, no edge-function changes, no math change to tax/tip/final charge.
- No change to per-item rows (the dashed-border unclaimed indicator stays).
- No change to host-side settlement views.
