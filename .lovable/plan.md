## Goal
Make the Step 3 (create-rally) "Create Event" button dramatically "pop out" of the dark backdrop with a physical lift, larger scale, and a more saturated neon orange glow.

## Plan

### 1. Enhance `.rally-scan-hero` in `src/index.css`
Add `transform: scale(1.06) translateY(-4px)` to the base class so the button physically lifts and enlarges. Push the drop-shadow values to near-neon intensity (opacity 1.0 / 0.7) and expand radii (0 0 32px, 0 0 64px). Add a white-hot inner edge via an additional `drop-shadow` or inset glow layer so the button edge reads as hot against the 88% black backdrop.

### 2. Enhance `@keyframes rallyHeroBreath`
Animate `transform: scale(1.06) translateY(-4px)` → `scale(1.10) translateY(-6px)` so the button pulses larger while I need to include `will-change: transform, filter` on `.rally-scan-hero` to keep the animation smooth.

### 3. Enhance `@keyframes rallyHeroHalo`
Increase the halo gradient opacity and scale range so the radial glow behind the button expands further and reads as a stage spotlight.

### 4. Verify cleanup
Confirm that `TutorialOverlay.tsx` already removes `rally-scan-hero` on step exit and on skip — no JS changes needed.

## No other files touched
Only `src/index.css` is modified. No TypeScript, no component logic, no regressions to Steps 1/2/4/5/6/7/8.