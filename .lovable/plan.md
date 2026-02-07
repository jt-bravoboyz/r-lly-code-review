
# Plan: "Dusk to Midnight Fade" Transition for After R@lly Mode

## Overview

Replace the current 2.2-second flashy rainbow glide with a smooth, intentional "Dusk → Midnight Fade" transition that feels like the night turning over from R@lly's orange theme to After R@lly's deep purple.

---

## Current vs. New Transition

| Aspect | Current | New "Dusk → Midnight" |
|--------|---------|----------------------|
| Duration | 2.2 seconds | 600-900ms |
| Effect | Rainbow sweep across screen | Subtle dim → gradient fade |
| Style | Flashy, celebratory | Intentional, atmospheric |
| Sparkles | 25 random colorful bursts | None (clean transition) |
| Sound | Complex multi-layer audio | Optional subtle tone |

---

## Visual Transition Stages

```text
Stage 1 (0-200ms): "Lights Lowering"
┌────────────────────────┐
│  Screen dims slightly  │
│  brightness: 1 → 0.85  │
│  Orange colors fade    │
└────────────────────────┘
           ↓
Stage 2 (200-600ms): "Color Shift"
┌────────────────────────┐
│  Orange → Blue/Purple  │
│  Gradient sweeps       │
│  top-to-bottom         │
└────────────────────────┘
           ↓
Stage 3 (600-800ms): "Night Settles"
┌────────────────────────┐
│  Deep purple locks in  │
│  brightness: 0.85 → 1  │
│  Stars fade in subtly  │
└────────────────────────┘
```

---

## Persistent "After R@lly" Indicator

Once in After R@lly mode, a badge will appear in the header:

```text
┌─────────────────────────────────────────┐
│ [Logo]   🌙 After R@lly     [Profile] │
│          ^^^^^^^^^^^^^^                 │
│          Purple badge chip              │
└─────────────────────────────────────────┘
```

---

## Files to Modify

### 1. `src/index.css`
- Replace `@keyframes after-rally-enter` with new "dusk-to-midnight" animation
- Remove or simplify the rainbow-glide overlay (`::after` pseudo-element)
- Adjust duration from 2.2s to ~800ms
- Add new smooth dimming + gradient transition keyframes

### 2. `src/hooks/useAfterRallyTransition.tsx`
- Replace complex multi-oscillator sound with optional subtle transition tone
- Remove sparkle creation (too flashy)
- Simplify haptic pattern to single soft pulse
- Update timing to match new 800ms duration

### 3. `src/components/layout/Header.tsx`
- Add optional `afterRallyMode` prop
- Render "🌙 After R@lly" badge when in After R@lly mode
- Style header background for purple theme

### 4. `src/pages/EventDetail.tsx`
- Pass `afterRallyMode` prop to Header component
- Ensure transition only runs once per session (already implemented)

---

## Technical Details

### New CSS Animation (replacing current)
```css
/* Dusk to Midnight Fade - replaces rainbow glide */
@keyframes dusk-to-midnight {
  0% {
    /* Current orange theme */
    filter: brightness(1);
    --bg-transition: 0%;
  }
  25% {
    /* Dim like lights lowering */
    filter: brightness(0.85);
  }
  60% {
    /* Mid-transition: warm to cool shift */
    filter: brightness(0.9);
    --bg-transition: 70%;
  }
  100% {
    /* Deep purple settled */
    filter: brightness(1);
    --bg-transition: 100%;
  }
}

.after-rally-mode {
  animation: dusk-to-midnight 800ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Simplified Transition Sound
- Single gentle "whoosh" descending tone
- Duration: ~400ms
- Much quieter and subtler

### Transition Trigger Flow
1. User clicks "I'm In!" → database updates
2. `showAfterRallyTheme` becomes `true`
3. `after-rally-mode` class applied with new animation
4. `triggerAfterRallyTransition()` plays subtle sound + single haptic
5. Header shows "After R@lly" badge

---

## Edge Cases Handled

- **Returning to page**: Animation won't replay (sessionStorage check exists)
- **Reverse transition**: If supported, uses same smooth fade in reverse (purple → orange)
- **Auto-trigger**: Same animation whether button or time-based trigger
- **Performance**: No DOM manipulation for sparkles; pure CSS animation

---

## Acceptance Criteria

- Transition feels like "day → night" shift, not a party explosion
- Duration is 600-900ms total
- No hard cuts or flashes
- Header shows "🌙 After R@lly" badge persistently
- No performance lag or flicker
- Works on both manual trigger and automatic state changes
