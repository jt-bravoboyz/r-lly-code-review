

# Fix: Replace Plain Circles with Actual Tier Badge Icons in BadgeLadderPreview

## Problem
The `BadgeLadderPreview` component (shown in walkthrough Step 12/13) renders plain colored circles with a single letter. The actual tier badge SVG emblems already exist in `TierBadgeIcon.tsx` — they just aren't being used here.

## Solution
Import and use the existing `TierBadgeIcon` component in `BadgeLadderPreview`, mapping the `BADGE_TIERS` data to the format it expects.

## Changes

### `src/components/tutorial/BadgeLadderPreview.tsx`
- Import `TierBadgeIcon` from `@/components/badges/TierBadgeIcon`
- Replace the plain `<div>` circle + letter with `<TierBadgeIcon tier={...} size="sm" />` for each tier
- Map each `BADGE_TIERS` entry to the `BadgeTier` shape expected by `TierBadgeIcon` (`tier_key`, `tier_name`, `min_points`)
- Keep rank labels, progress bar, and footer text unchanged

### No other files changed
The badge SVG emblems (Bronze shield, Gold shield, Emerald gem, Ruby gem, Diamond, Dark Matter orb) are all already defined inside `TierBadgeIcon.tsx` and will render automatically once the correct `tier_key` is passed.

