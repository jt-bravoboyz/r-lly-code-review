# Apple-Refined Itemized Claim Screen

Polish `src/components/payments/ClaimItemsView.tsx` (and one small wrapper tweak in `PaySplitShareDialog.tsx`) so the four features I just shipped feel iOS-native. No DB/API changes.

---

## 1. Sticky glass Live Summary

Restructure the component into a flex column with an internal scrollable list and a pinned footer:

- Outer wrapper: `flex flex-col max-h-[70vh]`.
- Item list: `flex-1 overflow-y-auto divide-y divide-border/40` (replaces today's `space-y-2` gaps — Apple-style hairlines instead of stacked cards).
- Live Summary: detaches from in-flow card and becomes a **sticky footer**:
  - Classes: `sticky bottom-0 -mx-* backdrop-blur-md bg-background/75 border-t border-border/40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`
  - Tight rows: `text-[13px] leading-tight`, three lines (Subtotal / Tax & Tip / Total) with `tabular-nums font-medium`.
  - Removes the boxy `card-rally border-primary/30 bg-primary/5` look — replaced by the glass bar.
  - Keeps the same math (`mySubtotalC + myTaxTipC = myTotalC`) and `onTotalsChange` callback.

In `PaySplitShareDialog.tsx`, give the wrapping `<DialogContent>` `p-0` adjustments only if needed so the sticky bar can hug the bottom of the modal; the dialog already has `max-h-[90vh] overflow-y-auto` which we'll narrow to let `ClaimItemsView` own its own scroll region for itemized mode.

## 2. Refined micro-interactions

- **Final total scale pulse:** wrap the total `<span>` with `key={myTotalC}` and class `transition-transform duration-150 ease-out scale-[1.02]` applied on a state flip via a one-shot `useEffect` that toggles a boolean for 150ms (then back to `scale-100`). Tabular-nums prevents horizontal jitter so the pulse is purely vertical/scale.
- **Avatar pop-ins:** swap the current `animate-in fade-in zoom-in-50 duration-200` for a tighter spring feel — add a tiny project-local keyframe `avatar-pop` in `tailwind.config.ts` (`0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) }`, `cubic-bezier(0.22, 1, 0.36, 1)`, 320ms) and apply `animate-[avatar-pop_320ms_cubic-bezier(0.22,1,0.36,1)]` on the `<Avatar>`.

## 3. Sophisticated unclaimed state

Replace today's loud dashed/pulsing primary block with a restrained breathing state:

- Unclaimed row: `border border-dashed border-primary/20 bg-primary/[0.01] animate-pulse [animation-duration:4s]` plus `rounded-xl` to soften.
- Claimed row: `border border-transparent bg-transparent` (the new `divide-y` hairline carries the structure).
- Drop the colored "Unclaimed"/"Claimed" pills — replace with a tiny right-aligned dot: `h-1.5 w-1.5 rounded-full bg-primary/40` (unclaimed) or `bg-muted-foreground/20` (claimed). Cleaner, less shouty.

## 4. Haptic-feedback layout

- Rows use `py-3 px-1` for breathing room within `divide-y`.
- Quantity buttons grow to Apple-grade tap targets: `h-9 w-9` (still visually compact thanks to `rounded-full` and `variant="ghost"` styling), with `active:scale-95 transition-transform` for tactile press.
- Replace generic `<Button variant="outline">` for +/- with `variant="ghost"` + `border border-border/60 rounded-full` so they read as iOS stepper buttons.
- Avatar stack ring: keep `ring-2 ring-background`; self avatar gets a thinner `ring-[1.5px] ring-primary`.
- Tap-target padding on the row itself isn't tappable (only the +/- are), so no accidental triggers.

---

## Technical Details

**Files:**
- `src/components/payments/ClaimItemsView.tsx` — the core refinement work above.
- `tailwind.config.ts` — add `avatar-pop` keyframe + animation entry.
- `src/components/payments/PaySplitShareDialog.tsx` — minor: relax `overflow-y-auto` on `DialogContent` for itemized mode so the inner sticky footer pins correctly; the rest stays.

**Tokens only:** `bg-background/75`, `border-border/40`, `border-primary/20`, `bg-primary/[0.01]`, `text-muted-foreground`, `ring-primary`. No raw hex, no new colors.

**No DB / API / RLS changes.** Math, schema, realtime channels, and `onTotalsChange` wiring are unchanged from the previous implementation.

**Out of scope:** Host-side settlement panel, dialog CTA styling, payment flow, notifications.
