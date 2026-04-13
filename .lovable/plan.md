

# Plan: Make Founder 25 a Standalone Premium Badge

## Overview

Remove the Founder 25 badge from the tiered progression system and give it a premium, cinematic, standalone treatment as an "Exclusive" category badge.

## Steps

### 1. Separate Founder 25 from Tiered Badges in Achievements Page

Split the `badges` array into two groups:
- **Exclusive badges** (`founder_25`) — rendered in a new "Exclusive" card section above the Activity Badges card
- **Standard badges** (everything else) — rendered as-is in the existing Activity Badges grid

New section uses a distinct header (e.g. "Exclusive" with a crown icon) and renders a single premium card for the Founder 25 badge.

### 2. Create FounderBadgeCard Component

New file: `src/components/badges/FounderBadgeCard.tsx`

A standalone card for the Founder 25 badge with:
- **Glassmorphism container**: `backdrop-blur-xl`, semi-translucent `bg-card/60`, subtle border with R@lly orange tint
- **Animated breathing glow**: Soft neon pulse using `#F47A19` — a CSS keyframe animation that scales box-shadow opacity in a slow sine wave (~3s cycle)
- **Shimmer sweep**: A diagonal light sweep across the card surface (reuse existing shimmer pattern from FoundingMemberBanner)
- **Crown icon** centered with orange glow ring
- **"Founder 25"** title + **"Exclusive"** label (no rank, no progress, no tier text)
- **"Permanently Earned"** status text instead of any progress indicator

### 3. Update ActivityBadgeGrid to Exclude Founder 25

Filter out `founder_25` from the grid so it doesn't appear twice. The grid continues to render all other badges with their existing tier logic untouched.

### 4. Update ActivityBadgeIcon — No Changes Needed

The `founder_25` entry in `FALLBACK_ICONS` stays (Crown icon). The new `FounderBadgeCard` handles its own rendering, so the icon component doesn't need modification.

## Technical Details

**Files created:**
- `src/components/badges/FounderBadgeCard.tsx` — premium standalone badge card with glassmorphism + breathing glow + shimmer

**Files modified:**
- `src/pages/Achievements.tsx` — split badges, add Exclusive section above Activity Badges
- `src/components/badges/ActivityBadgeGrid.tsx` — filter out `founder_25` from grid

**No changes to:**
- Badge award logic in `useAuth.tsx`
- Database records or migrations
- FoundingMemberBanner
- Any other badge's display or tier logic

