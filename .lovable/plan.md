## Two fixes in claim flow

### 1. Sheet closes after each tap
`ClaimItemsView` calls `onChange` (= parent `refetch`) on every +/- tap. Refetch rebuilds the `owedRequests` array, creating a new `r` object, which remounts `OwedRequestCard` and resets `claimOpen` to `false`.

**Fix:** Stop refetching the parent until the sheet closes.
- `src/components/payments/ClaimItemsView.tsx` — drop the `onChange?.()` calls inside `change()` and `shareAll()`. Realtime subscription already updates the in-sheet view live for everyone.
- `src/pages/SplitCheckHome.tsx` — call `onChanged()` once when the sheet closes: `onOpenChange={(o) => { setClaimOpen(o); if (!o) onChanged(); }}`.

### 2. Tip split evenly across all participants
Currently the live summary pools `tax + tip` and prorates that pool by the user's claimed-subtotal share. That overcharges anyone who ordered more than average. Backend `compute_itemized_share` already splits tip evenly per headcount and prorates only tax — make the local preview match.

**Fix in `ClaimItemsView.tsx`:**
- Compute `myTaxC = grandSubtotal > 0 ? round(taxCents * mySubtotal / grandSubtotal) : 0`.
- Compute `myTipC = participantIds.length > 0 ? round(tipCents / participantIds.length) : 0` (host included — already in participantIds).
- `myTotalC = mySubtotal + myTaxC + myTipC`.
- Update summary labels: replace "Prorated tax & tip" with two rows: **Your share of tax** (prorated) and **Tip (split evenly)**.

### Out of scope
- "Done" button — not needed once the sheet stops auto-closing; users can close via the standard sheet dismiss / overlay tap.