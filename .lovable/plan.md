## Problem
In `src/components/tutorial/GoingRoguePreview.tsx`, the "Gone Rogue" muted state uses an Apple emoji fire (`🔥`) inside the text string, while the default state uses the Lucide `<Flame>` icon. When the button animates from default → muted, the fire visual changes from the icon to the emoji.

## Fix
Replace the muted state's inline emoji with the `<Flame>` icon, matching the default state's visual:

```tsx
// Current muted state (line 60-65)
<>
  <Flame size={18} className="opacity-60" />
  <span>Gone Rogue 🔥</span>
</>

// Fixed muted state
<>
  <Flame size={18} className="opacity-60" />
  <span>Gone Rogue</span>
  <Flame size={18} className="opacity-60 scale-x-[-1]" />
</>
```

This keeps the same mirrored flame icon on both sides of the text, with `opacity-60` applied consistently across all three elements in the muted state.