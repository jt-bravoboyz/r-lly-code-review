

# Plan: Add "Founder 25" Activity Badge

## Overview

Add a new "Founder 25" activity badge to the existing activity badge system. It will appear in the Activity Badges grid on the Achievements page, visually styled as the most premium badge using R@lly Orange (#F47A19). It will be automatically awarded when a user is confirmed as a founding member.

## Steps

### 1. Insert Badge Definition (Database)

Insert a new row into `rly_activity_badges`:
- `badge_key`: `founder_25`
- `badge_name`: `Founder 25`
- `description`: `Exclusive badge for the first 25 R@lly members`
- `requirement_event_type`: `founding_member` (custom type, not tied to normal progression)
- `requirement_count`: `1` (binary -- you either have it or you don't)
- No tiered progression (this is a one-time exclusive badge)

### 2. Award Badge in Founding Member Flow (useAuth.tsx)

After a user is confirmed as a founding member (both in the `signUp` path and the post-OAuth `claim_founding_spot` path), insert/upsert a row into `rly_user_activity_badges`:
- `badge_key`: `founder_25`
- `progress_count`: `1`
- `earned_at`: now
- `current_tier_level`: `1` (Bronze -- marks it as earned)

This happens in two places in `fetchProfile`:
1. After successful `claim_founding_spot` RPC call (post-OAuth flow)
2. When `data.founding_member === true` is first detected

### 3. Add Fallback Icon (ActivityBadgeIcon.tsx)

Add `founder_25` to the `FALLBACK_ICONS` map, using the `Star` icon (or a `Crown`-style icon) to give it a premium feel.

### 4. Premium Visual Treatment (ActivityBadgeGrid.tsx)

Add a special case for `founder_25` badges: apply a golden/orange border glow and R@lly Orange accent to make it visually distinct from other badges, while staying within the existing grid layout.

## Technical Details

- **Database insert**: One row into `rly_activity_badges` table
- **useAuth.tsx**: ~10 lines added after founding member confirmation to upsert badge progress
- **ActivityBadgeIcon.tsx**: Add `founder_25: Star` (or `Crown`) to `FALLBACK_ICONS`
- **ActivityBadgeGrid.tsx**: Add special styling condition for `founder_25` badge_key
- No existing badge, banner, or flow logic is modified

