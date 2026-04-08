

# Fix: Squad Locations Overflow on Mobile

## Problem
On mobile screens, the attendee location rows overflow horizontally because:
1. The "Last Updated" header in `AttendeeMap.tsx` has `mr-11` (44px right margin) pushing it off-screen
2. The time badge in `AttendeeLocationItem.tsx` (e.g., "Unknown", "Just now") plus the navigation icon use `shrink-0`, preventing them from fitting within the viewport

## Fix

### 1. `src/components/tracking/AttendeeMap.tsx` (line 181)
- Remove the `mr-11` right margin from the "Last Updated" label — it's unnecessary padding that causes horizontal overflow on small screens

### 2. `src/components/tracking/AttendeeLocationItem.tsx` (lines 54-67)
- Add `ml-2` and constrain the right-side content so the badge text can truncate if needed
- Ensure the overall row uses `overflow-hidden` to prevent any child from expanding beyond the card width

These are two small CSS tweaks — no logic, data, or security changes.

## What Is NOT Touched
| Feature | Status |
|---|---|
| Location tracking logic | Unchanged |
| Reverse geocoding | Unchanged |
| Map rendering | Unchanged |
| All other components | Unchanged |

## Files Modified
- **Edit**: `src/components/tracking/AttendeeMap.tsx` — remove `mr-11` from "Last Updated"
- **Edit**: `src/components/tracking/AttendeeLocationItem.tsx` — add `overflow-hidden` to row, constrain badge width

