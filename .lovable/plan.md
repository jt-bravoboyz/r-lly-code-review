## Diagnosis
The claimed/unclaimed strip and per-person "claimed" amounts already exist in code, but they only render **inside the expanded `CollapsibleContent`** and only after the user opens the card. Your screenshot description points at the **collapsed header row** ("$X in · $Y open" / "$X tab total") — that's where you want the info to appear, so it's effectively invisible to you.

Fix: surface bill-status data at the header itself and load it eagerly so it shows the moment the tab card is in view (not only after expanding).

## Changes — `src/pages/SplitCheckHome.tsx` (`OwedRequestCard` only)

### 1. Load items + claims eagerly
Drop the `&& open` gate on the existing claim-summary effect so `items` and `claims` populate as soon as the card mounts (still itemized-only). Realtime subscription stays.

### 2. Header row gets a claimed/unclaimed micro-strip
Replace the current single line:
```text
$X in · $Y open
```
with a two-line stack on itemized cards:
```text
[orange] $CLAIMED claimed   [amber] $UNCLAIMED open
$X in · $Y settled
```
- Left chip: `Claimed $X.XX` (primary tint when > 0)
- Right chip: `Unclaimed $X.XX` (amber tint), or green "All claimed" pill when 0
- Smaller secondary line keeps the existing "$X in · $Y open" wording so payment progress is still visible
- Non-itemized cards keep today's single line untouched

### 3. Per-target rows already show "claimed" — leave them
The "claimed $X / owes $X" micro-stat next to Jenna / Ryan is already wired and will now show real numbers immediately because data loads eagerly.

### 4. Keep the in-expansion "Bill status" block
The detailed block inside `CollapsibleContent` stays as the drill-down view — same numbers, more breathing room.

## Out of scope
- No schema, edge function, or settlement math changes.
- No edits to `ClaimItemsView` or the "You Owe" tab.
