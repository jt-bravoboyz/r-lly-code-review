

# Fix: After R@lly Opt-In `.single()` Error

## Problem
When clicking "I'm In!" on the After R@lly dialog, the update query uses `.single()` which fails with "Cannot coerce the result to a single JSON object" when no matching row exists (e.g., user isn't in `event_attendees` for that event).

## Fix

### `src/hooks/useAfterRally.tsx` (line 104)
Change `.single()` to `.maybeSingle()` so the query gracefully handles zero-match cases instead of throwing.

One-word change. No logic, data, or security impact.

