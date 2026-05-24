# Fix: Create R@lly action bar floating mid-dialog

## Problem (confirmed in preview)

On mobile (414×896) and web, the sticky "Create R@lly" action bar renders **in the middle of the dialog**, with the Friends / Squads lists appearing *below* it. The "Add the extras" card sits directly under the bar too.

Root cause: the bar uses `fixed sm:absolute` but is nested inside `.rally-create-inner` → `.rally-create-glow-wrapper` → Radix `DialogContent`. Radix applies a `transform` to position the dialog, and the glow wrapper / inner have their own transforms/filters. Per CSS spec, `position: fixed` is captured by the nearest transformed ancestor, so the bar pins to the top of that ancestor instead of the viewport. `sm:absolute` has no positioned ancestor either. The runtime `--rally-action-bar-h` padding correctly reserves space, but the bar itself is misplaced — so padding doesn't help.

## Fix

Stop using `fixed`/`absolute`. Restructure `DialogContent` into a true **flex column** where the action bar is a normal flex sibling pinned to the bottom of the dialog frame, and only the middle section scrolls.

### Changes in `src/components/events/CreateEventDialog.tsx`

1. **DialogContent** becomes a non-scrolling flex column:
   - Remove `overflow-y-auto` and `create-rally-scroll` from `DialogContent`.
   - Add `flex flex-col` and keep `h-[100dvh] sm:h-auto sm:max-h-[90vh]`.
   - Drop the inline `scrollPaddingBottom` style (moves to the inner scroller).

2. **Middle section** (new wrapper around the form fields) gets the scroll:
   - Wrap the existing `.rally-create-inner` content in a `flex-1 min-h-0 overflow-y-auto create-rally-scroll scrollbar-hide` div.
   - Move `scrollPaddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)'` here.
   - Remove the giant `pb-[calc(... var(--rally-action-bar-h) ...)]` — no longer needed, the bar is a sibling, not an overlay.
   - Keep `paddingTop: max(env(safe-area-inset-top), 1.25rem)` on the inner.

3. **Action bar** becomes a normal flex child at the end:
   - Move the action-bar `<div>` (lines 798–828) **out of** `.rally-create-inner` and place it as the last child of `DialogContent`, after the scroll wrapper.
   - Replace `fixed sm:absolute left-0 right-0 bottom-0 z-30` with `shrink-0 z-30` (and keep the glass styling).
   - Keep `paddingBottom: max(env(safe-area-inset-bottom), 1rem)` for iOS home-indicator clearance.

4. **Cleanup** (no longer needed once layout is correct):
   - Remove the `ResizeObserver` effect that sets `--rally-action-bar-h` and the `actionBarRef`. (Optional — can leave the ref if other code reads it, but the CSS custom property is unused.)
   - The segmented control's `sticky top-0` stays — it now sticks inside the scroll wrapper, which is exactly what we want.

### Resulting structure

```text
DialogContent (flex flex-col, h-[100dvh] sm:h-auto)
├── ErrorBoundary
│   └── rally-create-glow-wrapper (flex flex-col, flex-1, min-h-0)
│       ├── scroll-wrapper (flex-1, min-h-0, overflow-y-auto)
│       │   └── rally-create-inner (form fields, sticky segmented nav)
│       └── action-bar (shrink-0, glass strip, Create R@lly button)
```

This makes the bar a *real* bottom-pinned element on every device — no transform-capture, no padding gymnastics — and the scroll area naturally ends right above it.

### Out of scope

- No business logic, validation, or form behavior changes.
- No changes to `index.css` (the `.create-rally-scroll` / iOS-zoom rules stay).
- No changes to other dialogs.
