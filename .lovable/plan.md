# Fix: spotlighted element appears dimmed during onboarding

## Root cause

`src/components/tutorial/TutorialOverlay.tsx` adds the `.rally-scan-hero` class (which has `z-index: 70`, lifting the target above the `z-[50]` dim overlay) — but then **clears it after 3 seconds** via `setTimeout(..., 3000)` / `clearInterval`. After 3s, the Create Event card drops back beneath the overlay's `bg-black/80` layer and looks washed out. The orange spotlight ring keeps animating (it lives inside the overlay), which is why the user sees a glowing ring around a dim button.

A second contributor: `.rally-scan-hero` in `src/index.css` aggressively rewrites the target's `background-color` to white and forces text colors. Even while active, this makes the card look different from its normal rendering instead of "identical, just brighter".

## Fix (Option B — direct z-index elevation, no portal needed)

Keep all tutorial copy, flow, step order, overlay opacity, dim coverage, bottom-nav behavior, and gating untouched. Only change layering.

### 1. `src/components/tutorial/TutorialOverlay.tsx`

In the hero-mode branch of the `scanTargets` effect (currently lines ~111-132):
- Replace the `.rally-scan-hero` toggle with a new lightweight class **`.rally-tutorial-spotlight`** applied to the target.
- Remove the `setTimeout(..., 3000)` that stops re-applying the class. Keep the 200ms `setInterval` re-apply loop (so the class survives DOM remounts) for the **entire duration of the step**; only clear it in the effect's cleanup (when the step changes or tutorial ends).
- Also apply `.rally-tutorial-spotlight` whenever `currentStep.targetSelector` is set (so spotlight elevation works on every step that highlights an element, not just Create Event). Add a small companion effect or fold into the existing target-finder effect.

### 2. `src/index.css`

Add the new class — purely structural, no color rewrites:

```css
.rally-tutorial-spotlight {
  position: relative;
  z-index: 60;            /* above overlay z-[50], below tutorial card */
  isolation: isolate;     /* guarantees its own stacking context */
}
```

Leave the existing `.rally-scan-hero` rules in place for now (still used by the breathing-glow visuals on multi-step scans). We are no longer applying it in single-target hero mode, so the white-background / text recoloring side effects disappear and the Create Event card renders identical to its normal home-screen look.

### 3. Verify stacking order matches spec

Confirm in `TutorialOverlay.tsx`:
- Overlay root: `z-[50]`
- Dim layer + spotlight ring: children of overlay (inherit z-50 stacking context)
- Spotlighted element: `z-60` via new class (above overlay)
- Tutorial command card: already inside overlay with `pointer-events-auto`; remains visually on top because it renders after the dim/ring and the card itself is opaque. No change needed.
- Skip Training + progress bar: already `z-10` inside overlay — unchanged.

The orange ring stays inside the overlay's stacking context (z-50) but is wider than the button (pad: 8), so it visibly halos around the elevated button without being occluded.

## Files touched

- `src/components/tutorial/TutorialOverlay.tsx` — swap hero class for `.rally-tutorial-spotlight`, remove 3s timeout, apply on every spotlight step.
- `src/index.css` — add `.rally-tutorial-spotlight` rule.

## Out of scope (do not change)

Tutorial step copy, order, count, gating, completion logic, Skip Training button, progress bar, Continue CTA routing, dim overlay opacity/color, bottom-nav tutorial dimming, home-screen layout.

## Acceptance

- Step 3: Create Event card renders fully bright and full-color above the dim overlay, with the orange ring around it, for the entire time the step is shown (not just the first 3 seconds).
- Every other step that has a `targetSelector` shows its target above the dim overlay at full brightness.
- Non-spotlighted areas remain dimmed.
- Tapping the spotlighted element still triggers its action; Continue CTA still advances the flow.
