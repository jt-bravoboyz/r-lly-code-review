

# Fix: Paparazzi Award Placement in RecapTour

## Problem
The Paparazzi award is isolated on the final step alongside Mission Accomplished. User wants Paparazzi grouped with all other Squad Stars, and the final step to be Mission Accomplished alone.

## Changes

### `src/components/events/recap/RecapTour.tsx`

**1. Steps array (line 56):** Add a new `'finale'` step type. Keep `'paparazzi'` removed since it merges into `'stars'`.
```
steps: [..., 'stars', 'finale']  // 'paparazzi' step removed
```

**2. Squad Stars section (line 243):** Remove the `.filter((a) => a.key !== 'paparazzi')` so ALL awards (including Paparazzi) render together.

**3. Current "paparazzi" step (lines 266-297):** Rename to `'finale'` and remove the Paparazzi award card. Keep only the Mission Accomplished section (horse icon, "Mission Accomplished", "The horse is back in the stable", "Tap to finish").

**4. CALLOUTS array:** Update the last entry to match — the finale callout stays as "The Paparazzi Has Spoken." or change to something like "Mission Complete." (already the first one, so we can use a new finale callout).

One file, three small edits. No logic, data, or security changes.

