# Rally Destination Pin — R@lly Flag Logo + Beacon Rings

## Context

The Track tab map (`src/components/tracking/AttendeeMap.tsx`) currently renders the rally's destination as a small black/white DOM dot (lines ~218–235). User avatar pins shipped recently and stay untouched. The R@lly flag brand mark already lives at `public/logo.svg` (referenced across the app — splash, brand placements). We'll reuse that exact asset for the destination marker.

## Scope (Additive Only)

- Replace ONLY the destination DOM marker inside `AttendeeMap.tsx` with a logo + 3 staggered concentric pulse rings.
- Add one CSS keyframe (`rally-beacon-ring`) to `tailwind.config.ts`.
- No other file or feature changes.

## Files

### Edit: `tailwind.config.ts`
Add a single keyframe + animation utility used only by the destination marker:

```
"rally-beacon-ring": {
  "0%":   { transform: "translate(-50%, -50%) scale(0.5)", opacity: "0"   },
  "15%":  { opacity: "0.45" },
  "100%": { transform: "translate(-50%, -50%) scale(3.6)", opacity: "0"   },
},
```
animation: `"rally-beacon-ring": "rally-beacon-ring 3.6s ease-out infinite"`.

### Edit: `src/components/tracking/AttendeeMap.tsx`
In the "Event location pin" block (~lines 218–235), replace the simple black-dot DOM construction with:

- Wrapper `div` ~48×48px, `position: relative`, anchored `center` via `mapboxgl.Marker({ anchor: 'center' })`.
- 3 absolutely-positioned ring `div`s, each 48×48, `border: 1px solid #F47A19`, `border-radius: 50%`, `box-shadow: 0 0 8px rgba(244,122,25,0.5)`, `will-change: transform, opacity`, `pointer-events: none`. Each uses the `rally-beacon-ring` animation with staggered `animationDelay` of `0s`, `1.2s`, `2.4s` so a ring is always visible.
- Center `<img src="/logo.svg">` 44×44, `border-radius: 50%`, `filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35))`, no extra border/frame (the logo's orange disc IS the container).
- Built via plain `document.createElement` + `el.innerHTML` so it integrates with the existing imperative marker code without React overhead.

Update logic:
- Continue creating the marker once on first render and only call `setLngLat([...])` on subsequent location changes — no re-mount.
- Tap behavior: today the dot has none; we preserve that (no click handler added).
- Cleanup unchanged: `eventMarkerRef.current?.remove()` on unmount.

## What stays exactly the same

- User avatar teardrop pins, current user's breathing glow, fit-bounds logic, theme switching, realtime subscription, "Open in Maps" chip, sharing/not-sharing lists, `LiveTracking` card, every other tab/feature.

## Acceptance

1. Destination on Track tab is the official R@lly flag logo (`/logo.svg`).
2. 3 staggered orange rings continuously pulse outward from its center.
3. Distinct motion vs the user's own pin (which still breathes).
4. Anchored at exact lat/lng, fixed pixel size at any zoom, premium in light + dark mode.
5. No other shipped feature touched.
