

# Glass Button System — Full Implementation Plan

## Problem
Buttons are currently flat solid-color blocks. They need glass surfaces, light reflections, depth, interaction physics, and subtle breathing motion to match the 2026 Glass/Liquid UI system.

## Approach
Two files need changes. No layout, logic, or component hierarchy modifications.

---

## File 1: `src/index.css` — Glass Button Foundation

### Update `.btn-gradient-primary` (line 163)
Replace the flat gradient with a glass-over-orange surface:
- Semi-translucent orange gradient with `backdrop-filter: blur(12px)`
- Top-edge white highlight via `inset 0 1px 0 rgba(255,255,255,0.2)`
- Soft orange outer glow shadow
- Add `position: relative; overflow: hidden` for the shimmer pseudo-element

### Add `.btn-gradient-primary::before` shimmer layer
- A diagonal white gradient stripe that slowly translates across the button every ~4s
- Creates the "light passing through glass" effect
- `pointer-events: none`, low opacity (~0.08)

### Update `.gradient-primary` (line 170)
- Same glass treatment: translucent gradient, inner highlight, outer glow
- Hover: `translateY(-1px)`, increased glow, brighter highlight
- Active: `scale(0.97)`, shadow tightens, glow compresses

### Add `.btn-glass` utility class (new)
For secondary/outline buttons that need the glass surface without orange:
- `background: rgba(255,255,255,0.06)`
- `backdrop-filter: blur(16px)`
- `border: 1px solid rgba(255,255,255,0.1)`
- Inner top highlight
- Hover: border brightens, subtle lift, glow appears
- Active: compress + shadow tighten

### Add `@keyframes btn-shimmer` (new)
- Slow diagonal light sweep (6s infinite)
- Used by primary CTA buttons only

### Add `@keyframes btn-breathe` (new)
- Very subtle box-shadow pulse (3s infinite)
- Applied to primary CTAs like Quick R@lly

### Add interaction state classes
- `.btn-glass-hover`: `translateY(-1px)`, border highlight, glow increase
- `.btn-glass-active`: `scale(0.96)`, shadow tighten, glow compress then release

---

## File 2: `src/components/ui/button.tsx` — Variant Updates

### Base class (line 8)
Add to the base CVA string:
- `relative overflow-hidden` (for shimmer pseudo-element)
- `hover:-translate-y-[1px]` (subtle lift on hover)
- Update `active:scale-[0.97]` to `active:scale-[0.96]`
- Add `transition-[transform,box-shadow,border-color,filter]`

### `default` variant (line 12)
Replace flat gradient with glass-primary system:
```
btn-gradient-primary text-white shadow-[0_4px_20px_hsl(22_90%_52%/0.3),inset_0_1px_0_rgba(255,255,255,0.2)] 
hover:shadow-[0_8px_30px_hsl(22_90%_52%/0.4),inset_0_1px_0_rgba(255,255,255,0.25)] 
hover:brightness-110 border border-white/20
```

### `destructive` variant (line 13)
Add glass treatment: `backdrop-blur-sm`, inner highlight via shadow, translucent gradient

### `outline` variant (line 14)
Already has glass basics — enhance with:
- `hover:-translate-y-[1px]`
- `hover:shadow-[0_8px_24px_hsl(0_0%_0%/0.3),inset_0_1px_0_rgba(255,255,255,0.08)]`

### `secondary` variant (line 15)
Add inner highlight and hover glow:
- `shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`
- `hover:shadow-[0_4px_16px_hsl(0_0%_0%/0.3),inset_0_1px_0_rgba(255,255,255,0.08)]`

### `ghost` variant (line 16)
Add subtle `active:scale-[0.96]` feedback (inherits from base)

---

## What This Does NOT Change
- No layout changes
- No component hierarchy changes  
- No new hooks or state
- No business logic modifications
- No new components
- Button sizes remain identical

---

## Summary

| File | Change |
|------|--------|
| `src/index.css` | Upgrade `.btn-gradient-primary` and `.gradient-primary` to glass surfaces; add shimmer keyframe, breathe keyframe, and `.btn-glass` utility |
| `src/components/ui/button.tsx` | Update CVA base + all variants with glass shadows, inner highlights, hover lift, and active compression |

2 files. Pure CSS/class changes. Every button in the app inherits the upgrade automatically.

