

# Fix: Prevent Duplicate R@lly Creation (Double-Submit Bug)

## Problem
When creating a R@lly, the submit button can be clicked multiple times before `createEvent.isPending` kicks in (React re-render delay). This created 4 duplicate "Wed Eric R@lly" events in your database within 40 seconds.

## Root Cause
Both `CreateEventDialog.tsx` and `QuickRallyDialog.tsx` rely solely on `createEvent.isPending` to disable the button. But `isPending` only becomes `true` after the React re-render triggered by the mutation start — leaving a ~100-200ms window for extra clicks.

## Fix

### 1. `src/components/events/CreateEventDialog.tsx`
- Add a local `isSubmitting` ref (not state, to avoid re-render race)
- Set it to `true` at the top of `onSubmit`, check it as a guard
- Reset on success or error
- Add `isSubmitting` to the button's `disabled` condition

### 2. `src/components/events/QuickRallyDialog.tsx`
- Same pattern: add `isSubmitting` ref guard in `onSubmit`
- Add to button's `disabled` condition

### 3. Clean up duplicates
- Delete the 4 duplicate "Wed Eric R@lly" events from the database, keeping only the most recent one (or whichever you prefer)

## What Is NOT Touched
| Feature | Status |
|---|---|
| Event creation logic | Unchanged |
| Join/invite flow | Unchanged |
| All other components | Unchanged |

