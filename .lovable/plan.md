## Quick R@lly dialog — mobile scroll fix

The dialog content currently has no height cap, so on short viewports the form pushes the **Start R@lly** button below the visible area and there's no way to scroll to it.

### Change (single file: `src/components/events/QuickRallyDialog.tsx`)

Restructure `<DialogContent>` into a three-region flex column:

1. **DialogContent** — `max-w-md p-0 max-h-[85dvh] flex flex-col gap-0`
   - Hard cap at `85dvh` (dynamic viewport, accounts for mobile URL bar). Falls back gracefully on browsers without `dvh`.
2. **DialogHeader** — `px-6 pt-6 pb-3 shrink-0` (fixed at the top)
3. **Form body** — flex-1 column with an inner scroll container:
   ```
   <form className="flex flex-col min-h-0 flex-1">
     <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
       {/* all existing fields */}
     </div>
     <DialogFooter className="px-6 py-4 border-t bg-background/95 backdrop-blur-md shrink-0">
       <Button type="submit" ...>Start R@lly Now</Button>
     </DialogFooter>
   </form>
   ```

The submit button moves out of the scrollable region into a sticky-at-bottom `DialogFooter` so it's always tappable, with a subtle top border + glass background to match the 2026 Glass/Liquid system. Existing button props (loading state, `aria-busy`, disabled logic) are preserved verbatim.

### Why this works on every viewport

- `max-h-[85dvh]` caps the dialog at 85% of the *visible* viewport on mobile — no overflow off-screen.
- The middle region (`overflow-y-auto`) absorbs any extra form length; users scroll the form, not the page behind the modal.
- The footer is rendered outside the scroll container, so the **Start R@lly** button is permanently visible above the keyboard / safe area.

### Files touched
- `src/components/events/QuickRallyDialog.tsx` (layout-only refactor — no logic changes)

### Out of scope
- `CreateEventDialog` already has `max-h-[90vh] overflow-y-auto` and a non-sticky submit; not requested in this fix.
- No DB / RLS / hook changes.

### Verification
- 320×568 viewport: header visible, form scrolls, **Start R@lly** button pinned to bottom border.
- 744×553 (current preview) and 390×844: no clipping, footer stays visible.
- Keyboard open on iOS Safari: footer stays above keyboard thanks to `dvh`.
