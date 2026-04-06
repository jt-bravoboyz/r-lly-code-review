

# Tiered Activity Badges — Full Implementation Plan

## Summary
Transform the 6 activity badges from binary unlocks into a 5-tier progression system (Bronze → Silver → Gold → Diamond → Dark Matter) with tier-colored visuals, glowing auras, progress rings that reset per tier, and bonus points on tier-up.

## Database Changes (1 migration)

### New table: `rly_activity_badge_tiers`
| tier_level | tier_name    | multiplier | bonus_points | color_hex |
|------------|-------------|------------|--------------|-----------|
| 1          | Bronze      | 1          | 25           | #CD7F32   |
| 2          | Silver      | 5          | 50           | #C0C0C0   |
| 3          | Gold        | 15         | 75           | #FFD700   |
| 4          | Diamond     | 50         | 100          | #57ADDD   |
| 5          | Dark Matter | 100        | 150          | #FF50B5   |

### Alter `rly_user_activity_badges`
Add column: `current_tier_level INTEGER DEFAULT 0`

### Update `rly_update_activity_badges` function
After counting `v_count` for each badge, loop through the 5 tier levels to find the highest reached (`v_count >= requirement_count * multiplier`). If `current_tier_level` increases, insert bonus points into `rly_points_ledger` with `event_type = 'badge_tier_up'`. Update `current_tier_level` on the row.

### Add point rule
Insert `badge_tier_up` into `rly_point_rules` with `points = 1` (actual bonus is variable, inserted directly by the function).

### Backfill
Loop through all users calling the updated function to sync existing progress.

## Frontend Changes

### `src/hooks/useBadgeSystem.tsx`
- Add `ACTIVITY_BADGE_TIERS` constant array with tier names, multipliers, and colors
- Update `UserActivityBadge` interface to include `current_tier_level: number`
- In `useActivityBadges`, expose `current_tier_level` from query results and compute `nextTierThreshold` (= `requirement_count * next_multiplier`) and `nextTierName` for each badge

### `src/components/badges/ActivityBadgeIcon.tsx`
- Accept new `tierLevel` prop (0-5)
- Border color changes by tier level using the tier color constants
- For Silver+ (tierLevel >= 2): add `box-shadow` glow using the tier color at 40% opacity, 8px spread
- For Dark Matter (tierLevel === 5): add CSS `@keyframes darkMatterGlow` that cycles `box-shadow` through `#F47A19 → #FFD700 → #57ADDD → #FF50B5` over 4 seconds
- Progress ring resets: use `progress toward next tier threshold` instead of base requirement
- Icon color uses tier color instead of generic primary

### `src/components/badges/ActivityBadgeGrid.tsx`
- Pass `tierLevel` to `ActivityBadgeIcon`
- Replace `"Earned!"` with tier name (e.g., `"Gold Rank"`)
- Between tiers show `"3/15 to Gold"` using the next tier's threshold and name
- Badge name uses `font-montserrat font-bold`
- Card border color matches current tier color
- Tooltip updated with current tier and next milestone
- On tier-up detection: fire a Sonner toast — `"Rank Up: Gold Enlisted (+75 Pts)"`

### `src/pages/Achievements.tsx`
- No structural changes needed — it already renders `ActivityBadgeGrid` with the badges from `useActivityBadges`

## Files Modified
- Database migration (new table, alter column, update function, point rule, backfill)
- `src/hooks/useBadgeSystem.tsx` — tier constants, expose `current_tier_level`, compute next tier info
- `src/components/badges/ActivityBadgeIcon.tsx` — tier-colored borders, glows, Dark Matter animation, progress ring reset
- `src/components/badges/ActivityBadgeGrid.tsx` — tier labels, progress text, Sonner toast, font-montserrat

No changes to squad, event, auth, CSS files, or database schema beyond the badge tables.

