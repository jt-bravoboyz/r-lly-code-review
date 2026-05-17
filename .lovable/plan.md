# Interactive Itemized Claim Screen

Upgrade `src/components/payments/ClaimItemsView.tsx` (and a tiny tweak to `PaySplitShareDialog.tsx`) so attendees see a live, social, fully-prorated split experience. No DB schema changes — `split_check_item_claims` already supports multiple profiles per item.

---

## 1. Attendee avatars on each item row

- On `refresh()`, after loading claims, fetch profile data for every distinct `profile_id` via `safe_profiles` (`id, display_name, avatar_url`).
- Cache in `claimantsByItem: Record<string, Array<{id, name, avatar, qty}>>`.
- Render a small avatar stack to the right of the item description:
  - Use shadcn `<Avatar>` + `<AvatarImage>` / `<AvatarFallback>` (initials).
  - Size `h-6 w-6`, `-ml-2` overlap, ring `ring-2 ring-background`.
  - Subtle pop-in animation (`animate-in fade-in zoom-in-50 duration-200`) so new claimers feel "live".
  - Current user gets an orange ring (`ring-primary`) to self-identify.

## 2. Shared items (fractional claims)

- **Remove the `remaining` cap.** Any attendee may always tap `+` on any item — no disabled state from supply.
- Per-person cost for an item becomes:
  `myShare = unit_price_cents * (myQty / totalClaimedQty) * item.quantity`
  - i.e. claims represent *weight*. If 2 people each claim 1 of a qty-1 item, total claimed = 2 → each pays 50% of `unit_price * 1`.
  - If 3 people claim 1 of a qty-2 item, each pays `unit_price * 2 / 3`.
- This matches the host's settlement math only when host RPC also prorates by weight; we already do (verified in `useMyUnpaidSplit` itemized path which calls the existing RPC). Client-side estimate purely drives the Live Summary — server remains source of truth at pay time.

## 3. Live Summary footer card

Below the item list, add a sticky-feel card (`card-rally` with `border-primary/30 bg-primary/5`) that recomputes on every claim change:

```text
Your Items Subtotal         $XX.XX
Your Prorated Tax & Tip   + $X.XX
─────────────────────────────────
Your Estimated Final Charge $XX.XX
```

Math:
- `mySubtotal = Σ myShare(item)` across all items.
- `grandSubtotal = Σ unit_price_cents * item.quantity` (request total pre-tax/tip).
- `taxTipPool = request.tax_cents + request.tip_cents` (passed in from parent — see #5).
- `myTaxTip = grandSubtotal > 0 ? taxTipPool * (mySubtotal / grandSubtotal) : 0`.
- `myTotal = mySubtotal + myTaxTip`.

Animate the final number with a brief `transition-all` + scale pulse when it changes.

## 4. Unclaimed-items glow

For each item, compute `totalClaimed = Σ claims.quantity_claimed` across all profiles.
- If `totalClaimed < item.quantity` → row gets `border-2 border-dashed border-primary/40 bg-primary/[0.03]` with a soft `animate-pulse` (slowed via custom `[animation-duration:3s]`).
- If `totalClaimed >= item.quantity` → solid `border border-border bg-muted/40` (claimed/over-claimed = settled visually).
- Small "Unclaimed" / "Claimed" pill on the right edge for clarity, using `text-[10px]` muted token.

## 5. Wiring

- `ClaimItemsView` props gain optional `tax_cents`, `tip_cents`, `onTotalsChange?: (myCents:number)=>void`.
- `PaySplitShareDialog.tsx` already fetches the request — pass `request.tax_cents` and `request.tip_cents` into `ClaimItemsView`, and use `onTotalsChange` to update the dialog's "Pay $X.XX" CTA in real time for itemized requests (currently it reads a server-side computed total; we'll prefer the live local estimate for display, server still authoritative at submit).

---

## Technical Details

**Files:**
- Edit `src/components/payments/ClaimItemsView.tsx` (main work)
- Light edit `src/components/payments/PaySplitShareDialog.tsx` (pass tax/tip, consume `onTotalsChange` for CTA label)

**No DB migration.** Existing `split_check_item_claims` (composite unique on `item_id,profile_id`) already supports many profiles per item. The fractional cost is purely a derived display + handled by the host's existing settlement RPC.

**Realtime:** Existing channel subscription stays; we just also re-fetch profile metadata when a new `profile_id` appears (cache hit otherwise).

**Tokens only** — `bg-primary/5`, `border-primary/40`, `ring-primary`, `text-muted-foreground`. No raw hex.

**Out of scope:** Host-side settlement panel, server payment math, schema changes, notifications.
