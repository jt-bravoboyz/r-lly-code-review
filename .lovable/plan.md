## Problem (width, not height)

On the native iOS build, the **Invite Friends** bottom sheet rows overflow horizontally so the **Invite** button on the right gets pushed off-screen / clipped:

In `src/components/events/InviteFriendsSheet.tsx` each row is:

```
<div className="flex items-center gap-3 px-3 py-2.5 ...">
  <Avatar className="h-11 w-11 ...">        ← 44px
  <div className="flex-1 min-w-0"> name </div>
  <Button className="min-h-[44px] px-4 ..."> Invite </Button>  ← no shrink-0
</div>
```

- The `<Button>` has no `shrink-0`, so on narrow iPhone widths (375px) the flex layout can compress or wrap it.
- The `ScrollArea` wrapper has `px-2` and each row adds `px-3`, eating ~40px before content even starts.
- Sheet content has default horizontal padding from `SheetContent` that compounds the squeeze.
- Long display names with `truncate` work, but the Invite pill itself (icon + "Invite" text + `px-4`) is wide enough that it gets clipped at the right edge on small screens.

## Fix (presentation only)

Edit `src/components/events/InviteFriendsSheet.tsx`:

1. **Lock the Invite button width** — add `shrink-0` to its className and tighten padding so it fits on 375px wide screens:
   - `min-h-[44px] px-4` → `min-h-[44px] px-3 shrink-0`

2. **Reduce row + scroll horizontal padding** so the row has more usable width:
   - `ScrollArea` inner `className="flex-1 px-2"` → `className="flex-1 px-1"`
   - Row `className="flex items-center gap-3 px-3 py-2.5 ..."` → `className="flex items-center gap-2 px-2 py-2.5 min-w-0 ..."`

3. **Guarantee the name column can shrink** — it already has `flex-1 min-w-0`; keep, and also add `min-w-0` to the row container (added above) so flex children honor truncation instead of pushing the button off-screen.

4. **Shrink the avatar slightly on the row** to reclaim space (44px → 40px, still meets touch target since it isn't the tap target): `h-11 w-11` → `h-10 w-10`.

No logic, no hooks, no copy changes. Pure layout fix so the **Invite** pill is fully visible and tappable on iPhone 13 / SE widths.

## Verification

After build, in iOS preview at 375×812 and 390×844: open an event → Invite Friends → confirm every row's Invite pill is fully on-screen with no horizontal clipping.
