## Problem

On `/squads/:id`, when the viewer is the Squad Captain (owner), the page content shifts left and the right edge gets clipped (Invite button, Quick R@lly, etc. extend past the viewport). Non-captain views render correctly. The difference between the two views is that captains see an extra `SquadSettingsDialog` icon button in the header, plus the captain-only "Remove" buttons inside the Members list.

## Root cause (hypothesis to confirm in build)

Two suspects, both captain-only:

1. **Header row overflow.** In `src/pages/SquadDetail.tsx` (lines 357–386), the sticky header is a single `flex items-center gap-3 p-4` row containing: back button, avatar + name block (`flex-1 min-w-0`), `SquadSettingsDialog` trigger, and Refresh button. With 4 icon buttons + gaps + padding on a 390px viewport this is tight; if the name block's `min-w-0` ever loses (e.g. a non-truncating child like the Captain Badge in the header variant or the icon avatar growing), the row pushes wider than the viewport.

2. **ScrollArea viewport.** The body is wrapped in `<ScrollArea className="h-[calc(100vh-140px)]">` (line 389). Radix `ScrollArea` viewports use `display: table` internally, so any child wider than the viewport (a captain-only "Remove" button row, a long member name, etc.) makes the whole scroll content grow horizontally instead of wrapping. The outer `overflow-x-hidden` doesn't help because the ScrollArea creates its own scroll context.

## Plan

1. **Verify in the preview** which container is actually overflowing (header vs. ScrollArea body) using the browser dev tools / a quick inspection on `/squads/32b2bae9-...` while logged in as the captain. This decides which of steps 2/3 are needed (likely both).

2. **Harden the header row** in `src/pages/SquadDetail.tsx`:
   - Add `min-w-0` to the outer header flex container.
   - Wrap the trailing action buttons (`SquadSettingsDialog` + Refresh) in a single `flex items-center gap-1 shrink-0` group so they always reserve their space together.
   - Tighten icon-button gap to `gap-2` on small screens (`sm:gap-3`) to give the name more room.
   - Keep `truncate` on the squad name (already present).

3. **Stop the ScrollArea from growing horizontally**:
   - Add a `w-full min-w-0` wrapper as the immediate child of `<ScrollArea>` and apply `min-w-0` to the inner `p-4 space-y-6` container.
   - Or, simpler and safer: replace the `ScrollArea` here with a plain `<div className="overflow-y-auto overflow-x-hidden">` since the page is already a normal mobile scroll surface and doesn't need Radix's custom scrollbar. This eliminates the table-layout overflow class of bugs entirely.

4. **Members rows**: ensure the row's left side (`flex items-center gap-3`) gets `min-w-0` and the name `<p>` gets `truncate`, so a long display name plus the captain-only "Remove" button can't push the card wider than the viewport.

5. **Verify** at 390×645 (current preview viewport) as both captain and non-captain:
   - Header buttons all visible, name truncates with ellipsis.
   - Chat / Invite grid cells both fully visible; Quick R@lly button spans the full width with no right-edge clipping.
   - Members list rows fit; Remove button visible without horizontal scroll.

## Out of scope

- No changes to `SquadSettingsDialog` internals, business logic, queries, or notifications.
- No visual redesign — only layout containment fixes.
