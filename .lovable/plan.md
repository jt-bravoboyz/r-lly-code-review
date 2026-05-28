## Goal
Make the "See All" link in the Upcoming section on Home open a full list of upcoming R@llies, instead of routing to the placeholder `/events` (R@lly Feed coming soon) page.

## Changes

1. **Create `src/pages/UpcomingRallies.tsx`** — Mirrors `PastRallies.tsx` structure:
   - Sticky orange glass header with back arrow + `Calendar` icon + title "Upcoming R@llies".
   - Pulls `categorized.upcoming` from `useMyEvents()`.
   - Loading skeletons, empty state ("No R@llies on deck — start one and rally your squad."), and full list rendered with `EventCard`.
   - Includes `BottomNav`.

2. **`src/App.tsx`** — Register new route `/rallies/upcoming` → `<UpcomingRallies />` (lazy import next to `PastRallies`).

3. **`src/pages/Index.tsx`** (line 223) — Change the Upcoming "See All" link from `/events` to `/rallies/upcoming`.

## Out of scope
- `/events` route stays as-is (still shows R@lly Feed coming soon for the bottom nav tab).
- No changes to `useMyEvents` or `EventCard`.
