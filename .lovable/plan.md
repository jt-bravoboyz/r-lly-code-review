# Bulk Invite Upgrade — On R@lly Tab

Layer multi-select bulk-invite onto the existing Hamilton invite dialog. Header card, SMS preview, Squads tab, and Text tab stay exactly as-is. Only the **On R@lly** tab gets richer behavior.

## What Changes

```text
┌────────────────────────────────────────────┐
│  [Premium Header Card — unchanged]         │
├────────────────────────────────────────────┤
│  ⟪ On R@lly │ Squads │ Text ⟫              │
├────────────────────────────────────────────┤
│  Search friends…                           │
│  ─ Suggested        3   [Select all]       │  ← new shortcut
│    ◉ [avatar] Jamie       Squad Mate       │  ← tap row toggles select
│    ○ [avatar] Drew        Your Referral    │
│  ─ All Friends     14                      │
│    ◉ [avatar] Casey       R@lly Friend     │
│  …                                         │
├────────────────────────────────────────────┤
│  [ ✦ Invite Selected (4) ]  ← floating CTA │
├────────────────────────────────────────────┤
│  History  ●                  ✦ Influence   │
└────────────────────────────────────────────┘
```

## Behavior

### Multi-select rows
- Each friend row becomes tap-to-toggle. A circular checkbox indicator on the **left** (empty ring → filled primary disc with `Check`) replaces the per-row Invite button.
- Selected row gets a subtle `bg-primary/[0.06] ring-1 ring-primary/30` treatment + `transition-all duration-200`.
- Already-attending/invited friends stay filtered out (existing logic). Friends already invited *this session* (in `invitedFriendIds`) render disabled with a muted "Invited" pill instead of the checkbox.

### Select All shortcut
- A small ghost "Select all" / "Clear" button sits next to the **Suggested** count.
- Toggles the entire Suggested group in/out of `selectedFriendIds` in one tap.
- Hidden when Suggested is empty.

### Floating bulk action button
- Anchored at the bottom of the On R@lly tab (above the dialog footer), inside the tab content so it doesn't disrupt other tabs.
- Visible only when `selectedFriendIds.size > 0`. Slides in with `animate-fade-in`.
- Label: `Invite Selected ({n})` with `tabular-nums` and a `Send` icon.
- States: `Invite Selected (4) → Sending… → ✓ Invited 4 friends` (single transition, no layout shift). Uses primary fill, full width, `rounded-full`.

### Bulk transition / single success animation
- On click: `setIsBulkInviting(true)` → one `createInvites.mutateAsync({ profileIds: [...selected] })` call → record each in invite history.
- On success: trigger a `bulkBurst` flag for ~1.4s that:
  - Adds `animate-scale-in` + `Sparkles` icon flash to the bulk button.
  - Adds `animate-fade-out` to all newly-invited rows simultaneously, then they collapse out (single visual "whoosh") as those IDs move into `invitedFriendIds` and the filter removes them.
- Selection is cleared. Toast: `Invited {n} friends to the R@lly`.

### Economy preserved
- The premium header card and SMS preview render exactly as today — no resizing, no extra chrome.
- The On R@lly scroll list height shrinks by ~52px to make room for the floating CTA only when something is selected (uses conditional `pb-14` instead of restructuring layout).
- Single-row "Invite" button is removed from the friends tab in favor of the cleaner select-and-bulk pattern. Squads tab keeps its per-card Invite button.

## File To Edit

- `src/components/events/InviteToEventDialog.tsx` — additive: new state (`selectedFriendIds`, `isBulkInviting`, `bulkBurst`), new `toggleSelect`, `selectAllSuggested`, `handleBulkInvite` handlers, refactored `renderFriendRow`, new floating CTA inside the friends `TabsContent`. No prop changes, no new files, no DB changes.

## Implementation Notes

- Use existing `createInvites.mutateAsync({ eventId, profileIds, eventTitle })` — it already accepts an array, so bulk is a single network call.
- `recordInvite` runs in a `Promise.all` for the selected set after the bulk mutate resolves.
- Errors that include `already been invited` are merged into `invitedFriendIds` silently so the UI stays consistent.