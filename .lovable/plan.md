

# Plan: Add Mini Founder 25 Gem Badge Next to Founder Members' Names

## Overview

Create a miniature purple hexagonal gem indicator that appears inline next to any Founder 25 member's display name throughout the app.

## Approach

Rather than modifying every query to fetch `founding_member`, create a **`useFounderIds` hook** that fetches all founder profile IDs once (max 25 users) and caches them app-wide via React Query. Components then check `founderIds.has(profileId)` to decide whether to render the gem. This avoids touching every data-fetching hook.

## Steps

### 1. Database migration: Add `founding_member` to `safe_profiles` view

Recreate the `safe_profiles` view to include the `founding_member` column so it's publicly queryable.

### 2. New hook: `src/hooks/useFounderIds.tsx`

- Query `safe_profiles` for all rows where `founding_member = true`, selecting only `id`
- Return a `Set<string>` of founder profile IDs
- Cached via React Query with a long stale time (founders don't change often)

### 3. New component: `src/components/badges/MiniFounderGem.tsx`

- Accepts `profileId: string` prop
- Uses `useFounderIds()` to check if the user is a founder
- Renders a 16px inline SVG hexagonal gem with purple gradient fill and subtle breathing glow animation
- No text inside the gem — just the shape
- Returns `null` if not a founder
- CSS animation kept minimal: just the breathing glow

### 4. Integrate `<MiniFounderGem>` in display name locations

Add the component immediately after the display name text in these files:

| File | Location |
|------|----------|
| `src/pages/Profile.tsx` | Line 341 — own profile name (use `profile.id