

# Quick R@lly vs Plan a R@lly — Subtle Hierarchy

## Current State
Both cards already have slight differentiation (Quick R@lly at full opacity, Plan a R@lly at `/95`/`/90`), but it's too subtle to read as intentional hierarchy.

## Changes — `src/pages/Events.tsx` only

### Quick R@lly Card (line 129)
Enhance as the "hero" action:
- Gradient: `from-primary via-primary to-primary` (full saturation, no fade)
- Shadow: `shadow-xl shadow-primary/25` → stronger ambient glow
- Hover shadow: `shadow-2xl shadow-primary/35` → more energy on interaction
- Add `animate-glass-breathe` class for subtle living pulse

### Plan a R@lly Card (line 148)
Step down in visual weight:
- Gradient: `from-primary/85 via-primary/80 to-primary/85` — noticeably softer but still unmistakably orange
- Shadow: `shadow-md shadow-primary/8` — less glow presence
- Hover shadow: `shadow-lg shadow-primary/12` — more restrained hover energy
- Decorative orb: reduce from `bg-white/5` to `bg-white/3` — less visual activity
- Subtitle text: keep `text-white/70` (already slightly dimmer than Quick R@lly's `text-white/80`)

## What Does NOT Change
- Layout, size, position, component structure, functionality
- Both cards remain R@lly orange — no new hues
- Glass system preserved

## Summary
| Element | Quick R@lly | Plan a R@lly |
|---------|------------|--------------|
| Gradient opacity | 100% | ~80-85% |
| Shadow glow | Strong (`/25`) | Subtle (`/8`) |
| Hover glow | Intense (`/35`) | Restrained (`/12`) |
| Breathing pulse | Yes | No |

1 file, ~2 line edits. Pure class changes.

