

# Fix: Pass Tier Level to Earned Badges on Profile Page

## Problem
On the Profile page, earned activity badges render without tier colors because the `tierLevel` prop is not passed to `ActivityBadgeIcon`. The Achievements page works correctly because `ActivityBadgeGrid` passes the tier level.

## Change — `src/pages/Profile.tsx` (lines 452-461)

Add `tierLevel={badge.current_tier_level}` to the `ActivityBadgeIcon` component, and update the `required` value in the progress prop to use `nextTierThreshold` instead of the base `requirement_count` (so the progress ring matches the tiered system):

```tsx
<ActivityBadgeIcon 
  key={badge.badge_key} 
  badge={badge}
  progress={{ 
    current: badge.progress_count, 
    required: badge.nextTierThreshold, 
    isEarned: true 
  }}
  tierLevel={badge.current_tier_level}
  size="sm"
  showProgress={false}
/>
```

## Files Modified
- `src/pages/Profile.tsx` — add `tierLevel` prop to earned badge icons

Single-line fix, no database or other file changes.

