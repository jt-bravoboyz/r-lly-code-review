

# Opening Animation — Premium Cinematic Redesign

## Overview
Complete rewrite of `SplashScreen.tsx` (590 lines → ~350 lines) to create a cinematic, Apple-quality launch sequence. The current comet/spark/arc system is replaced with a layered, phase-driven animation using CSS transforms, opacity, and canvas-free DOM elements.

## Architecture
The new splash screen uses `requestAnimationFrame` with elapsed-time phases. All animation is driven by a single timestamp, no complex particle systems.

## Animation Phases (Total: ~3.0s)

### Phase 1 — Activation (0.0s – 0.45s)
- Screen opens on near-black (`#0A0A0A`) with a radial gradient center
- A faint orange ambient glow fades in at center (radial gradient, opacity 0→0.15)
- A horizontal light sweep passes across the screen (thin white line, left→right, blur 40px)
- Feeling: system powering on

### Phase 2 — Tension Build (0.45s – 1.1s)
- Ambient glow pulses gently (opacity oscillates 0.15→0.25)
- A second diagonal light sweep (subtle, top-left to bottom-right)
- Faint glass-like refractive layer shifts with parallax (translucent div, slight translateY)
- Controlled orange glow builds to peak at ~1.0s then recedes
- Feeling: calibrating for the night

### Phase 3 — Typography Reveal (1.1s – 1.9s)
- **"Ready."** — fades in + translateY(12px→0), slight scale 0.97→1.0, holds, then fades
- **"Set."** — same motion, tighter timing, slightly more confident scale
- **"R@lly."** — lands with more weight: scale 0.95→1.02→1.0 (slight overshoot), the "@" rendered in R@lly orange (`#F47A19`), subtle text-shadow glow on the "@"
- Each word appears sequentially in the same centered position (replaces previous)
- Typography: Montserrat extrabold, large, tracked, white
- A soft horizontal shimmer passes over "R@lly." as it resolves

### Phase 4 — Logo Lock (1.9s – 2.35s)
- "R@lly." text subtly scales up and the "@" glow intensifies briefly
- A controlled orange edge-light bloom pulses once around the text
- The tagline "R@lly your troops." fades in below with delay
- Feeling: the brand has arrived

### Phase 5 — Seamless Transition to Auth (2.35s – 3.0s)
- The logo/tagline fades out with slight upward drift
- Background glow persists and settles
- `onComplete()` fires at ~3.0s
- The auth screen inherits the same dark background, creating visual continuity

## Technical Approach

### `src/components/SplashScreen.tsx` — Full rewrite
- Single `useEffect` with `requestAnimationFrame` loop updating elapsed time
- All visuals are DOM divs with inline styles computed from elapsed time
- No SVG, no canvas, no particle arrays
- Easing: custom cubic-bezier curves (ease-out for entrances, ease-in for exits)
- Light sweeps: absolutely positioned divs with CSS `background: linear-gradient(...)`, translated via `transform`
- Glow: radial gradient div with animated opacity
- Typography: `<span>` elements with computed opacity/transform

### `src/components/AppEntry.tsx` — Duration update
- Change `duration={5250}` → `duration={3000}` to match the new shorter sequence

### No other files change
- Auth pages, routing, colors, design system — all untouched
- The dark background (`#0A0A0A` / `#121212`) is consistent with existing app aesthetic

## Key Constraints Honored
- No sound (web limitation)
- No party/military imagery
- Orange used sparingly (glow accents + "@" only)
- Montserrat font (already loaded)
- All CSS-driven, no external dependencies
- Seamless transition into existing auth flow

## Files

| File | Change |
|------|--------|
| `src/components/SplashScreen.tsx` | Full rewrite — cinematic phased animation |
| `src/components/AppEntry.tsx` | Update duration from 5250 to 3000 |

2 files changed.

