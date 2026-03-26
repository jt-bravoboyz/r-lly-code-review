

# R@lly Brand Orange Correction — Strict Enforcement

## Root Cause
The R@lly orange token (`hsl(22 90% 52%)` / `#F26C15`) is correct, but it's being **diluted by opacity modifiers** throughout the app. Classes like `bg-primary/90`, `bg-primary/80`, `bg-primary/75`, and `bg-primary/65` let the light background bleed through, creating a washed, faded appearance. The fix is to remove opacity reduction on brand-critical surfaces while keeping the glass system intact.

## Strategy
- Headers: Use `bg-primary` (100% opacity) — no gradient fade-out
- CTA cards: Use full-opacity or very-near-full gradients (no `/65` or `/75`)
- Background orbs: Replace `orange-400` and `yellow-400` references with `primary`
- Keep all glass effects, glows, and depth — only tighten the base color

---

## File Changes

### 1. `src/pages/Index.tsx` (line 85)
**Header**: Change `bg-primary/90` → `bg-primary`
- The Index page header should be the purest brand anchor

### 2. `src/pages/Events.tsx`
**Header (line 72)**: Change `bg-primary/80` → `bg-primary`
**Quick R@lly card (line 129)**: Change `from-primary/85 via-primary/80 to-primary/75` → `from-primary via-primary to-primary/95`
**Create Event card (line 148)**: Change `from-primary/75 via-primary/65 to-primary/70` → `from-primary/95 via-primary/90 to-primary/95`
**Background orbs (lines 66-68)**: Replace `bg-orange-500/6` → `bg-primary/6` and `bg-amber-500/5` → `bg-primary/5`

### 3. `src/pages/Squads.tsx`
**Header (line 45)**: Change `from-primary via-primary to-primary/90` → `bg-primary`
**Background orbs (lines 39-41)**: Replace `bg-orange-400/5` → `bg-primary/5` and `bg-yellow-400/5` → `bg-primary/5`

### 4. `src/components/layout/Header.tsx` (line 22)
Change `from-primary/95 via-primary/90 to-primary/85` → `bg-primary`
- This is the shared header component — must be solid brand orange

### 5. `src/components/layout/BottomNav.tsx`
Verify the active state icon uses `text-primary` (already correct). No changes expected.

### 6. `src/index.css`
No token changes needed — `--primary: 22 90% 52%` is already correct.
The `.btn-gradient-primary` and `.gradient-primary` gradients use `hsl(22 90% 52% / 0.9)` to `hsl(22 90% 42% / 0.95)` — bump the top to full opacity: `hsl(22 90% 52%)` to `hsl(22 90% 42% / 0.95)`. This makes buttons feel solid while the darker bottom still creates depth.

---

## What Does NOT Change
- Layout, components, flows, logic — untouched
- Glass system (blur, glow, shimmer, depth) — preserved
- Dark mode — unchanged
- Button interaction physics — unchanged

## Summary

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Header → `bg-primary` (remove /90) |
| `src/pages/Events.tsx` | Header → `bg-primary`; CTA cards → near-full opacity; orbs → use `primary` token |
| `src/pages/Squads.tsx` | Header → `bg-primary`; orbs → use `primary` token |
| `src/components/layout/Header.tsx` | Header → `bg-primary` (remove gradient fade) |
| `src/index.css` | `.btn-gradient-primary` top stop → full opacity |

5 files, all class/style-only changes. No logic, layout, or component modifications.

