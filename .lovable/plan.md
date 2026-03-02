

# R@lly Map Stabilization -- Directions Fix + Attribution Compliance

## Summary

8 files modified. Fix all `window.open` calls for map navigation with device-aware behavior, add compact attribution to all Mapbox maps, apply two defensive refinements (null link guard + attribution dedup guard). No lifecycle, routing, clustering, or theme switching changes.

---

## File 1: `src/lib/mapStyles.ts` -- Add `openDirections` helper

Add at the end of the file:

```typescript
export function openDirections(url: string) {
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches;

  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
```

Used only in deep callback chains (toast actions in RallyHomeButton and RallyHomeDialog) where anchor tags are impossible.

---

## File 2: `src/components/location/LocationMapPreview.tsx`

1. **Remove** `handleGetDirections` function (lines 43-48)
2. **Add** `directionsUrl` computed value: `` `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` ``
3. **Remove** `Button` import (no longer needed)
4. **Fallback UI** (lines 123-134): Replace `<Button>` with `<a>` styled as button
5. **Map overlay** (lines 151-162): Replace `<Button>` with `<a>` styled as button
6. **Attribution** (after map creation, line 62): Add compact attribution with dedup guard:
   ```typescript
   const hasAttribution = (map.current as any)._controls?.some(
     (c: any) => c instanceof mapboxgl.AttributionControl
   );
   if (!hasAttribution) {
     map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
   }
   ```

---

## File 3: `src/components/rides/NavigateToPickupButton.tsx`

1. **Remove** `handleNavigate` function and `Button` import
2. **Compute URL** at component level -- return `null` if no URL available (hides button entirely)
3. **Convert both renders** (icon + default) from `<Button>` to `<a>` tags with same styling classes
4. **Keep** `onClick` on anchors for toast notification (anchors support both `href` + `onClick`)

---

## File 4: `src/components/tracking/AttendeeMap.tsx`

1. **Remove** `openFullMap` function (lines 119-131)
2. **Compute** `mapLinkUrl` from first sharing attendee or event location
3. **Conditional render** (Refinement 1 -- null guard): If `mapLinkUrl` exists, render `<a>` with hover overlay. If null, render plain `<div>` with no link behavior or hover effects. No `href="#"` fallback.
4. **Remove** unused `Button` import

---

## File 5: `src/components/home/RallyHomeButton.tsx`

1. **Import** `openDirections` from `@/lib/mapStyles`
2. **Line 240**: Replace `window.open(...)` with `openDirections(...)`
3. **Line 389**: Replace `window.open(...)` with `openDirections(...)`

---

## File 6: `src/components/home/RallyHomeDialog.tsx`

1. **Import** `openDirections` from `@/lib/mapStyles`
2. **Line 73**: Replace `window.open(...)` with `openDirections(...)`

---

## File 7: `src/components/tracking/BarHopStopsMap.tsx`

1. **Add** `attributionControl: false` to map options (line 58)
2. **Add** compact attribution with dedup guard after map creation (after line 66):
   ```typescript
   const hasAttribution = (map.current as any)._controls?.some(
     (c: any) => c instanceof mapboxgl.AttributionControl
   );
   if (!hasAttribution) {
     map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
   }
   ```

---

## File 8: `src/components/navigation/TurnByTurnNav.tsx`

1. **Add** `attributionControl: false` to map options (line 201)
2. **Add** compact attribution with dedup guard after map creation (inside `on('load')` callback):
   ```typescript
   const hasAttribution = (map.current as any)._controls?.some(
     (c: any) => c instanceof mapboxgl.AttributionControl
   );
   if (!hasAttribution) {
     map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
   }
   ```

---

## What Is NOT Changed

- Map initialization logic
- Route fetching / Directions API calls
- Route hash memoization (`routeCoordsHashRef`)
- Clustering source/layers
- Theme switching (`setStyle` + hash reset)
- Token handling (`useMapboxToken`)
- TurnByTurnNav navigation style (`navigation-night-v1`)
- Any backend logic

## Minor Refinements Included

1. **AttendeeMap null link guard** -- Conditional `<a>` vs `<div>` based on `mapLinkUrl` existence. No `href="#"`.
2. **Attribution dedup guard** -- All 3 Mapbox maps check `_controls` before adding `AttributionControl` to prevent duplicates on re-mount edge cases.

