

# R@lly Map Branding and Provider Unification

## Summary

Remove Google Static Maps from AttendeeMap, replace with Mapbox Static Images API, delete the Google Maps key hook and edge function, and enhance the existing `applyRallyMapOverrides` with additional layer filtering. No changes to map lifecycle, routing, clustering, or theme switching.

---

## File Changes (5 files modified, 2 files deleted)

### 1. `src/components/tracking/AttendeeMap.tsx` -- Replace Google Static with Mapbox Static

**Remove:**
- `useGoogleMapsKey` import
- `googleMapsKey` / `loadingKey` usage
- `generateMapUrl()` function using Google Static API

**Add:**
- `useMapboxToken` import
- `useTheme` import (for theme-aware style selection)
- New `generateMapUrl()` using Mapbox Static Images API

**Mapbox Static URL format:**
```
https://api.mapbox.com/styles/v1/mapbox/{style}/static/{markers}/{auto}/{width}x{height}@2x?access_token={token}
```

- Light mode style: `streets-v12`
- Dark mode style: `dark-v11`
- Marker format: `pin-s+F26C15({lng},{lat})` (R@lly orange pins)
- Event location marker: `pin-l+0A0A0A({lng},{lat})` (dark pin for venue)
- Use `auto` for automatic bounds fitting when multiple markers exist
- Use `{lng},{lat},14` center when only event location (no sharing attendees)
- Size: `600x300@2x` for retina quality

**Loading state:** Replace `loadingKey` with `isLoading` from `useMapboxToken`

**Hover overlay text:** Change "Open in Google Maps" to "Open in Maps" (provider-neutral)

The map link URL remains Google Maps directions (this is navigation, not map rendering).

---

### 2. `src/hooks/useGoogleMapsKey.tsx` -- DELETE

No longer needed. Only consumer was AttendeeMap.

---

### 3. `supabase/functions/get-google-maps-key/index.ts` -- DELETE

Edge function no longer needed. The `GOOGLE_PLACES_API_KEY` secret can remain for now (used by `search-places` if applicable) but this edge function is removed.

---

### 4. `src/lib/mapStyles.ts` -- Enhance POI filtering

**Current state:** Filters POI to `food_and_drink` and `entertainment` only. Hides transit, airport, parking, ferry.

**Add to the hide list in `applyRallyMapOverrides`:**
- `layer.id.includes('medical')`
- `layer.id.includes('industrial')`
- `layer.id.includes('government')`

These are already partially covered by the POI class filter, but some Mapbox styles have dedicated layers for these categories that bypass the class-based filter. Adding explicit visibility:none ensures complete coverage.

No other changes to this file. The existing color tokens for land, water, and roads already match the R@lly design system as specified in the request.

---

### 5. `src/components/location/LocationMapPreview.tsx` -- Camera feel refinement

**Current:** `flyTo` uses `duration: 1100` and `zoom: 15`

**Change:** Update to `duration: 1100` (already correct) -- no change needed here.

Actually, reviewing the code, the camera feel is already correct:
- `flyTo` duration is 1100ms (within the 1000-1100ms spec)
- Zoom is 15
- No changes needed

---

### 6. `src/components/tracking/BarHopStopsMap.tsx` -- Already correct

Reviewing against the spec:
- Pitch 20: already set (line 63)
- FlyTo duration 1200ms with easeOutQuad: already set (lines 282-286)
- Route colors use `RALLY_ROUTE_COLORS.afterRally`: already set
- Marker styles with orange/white/green check: already implemented
- No changes needed

---

## What IS Changed

| Item | Change |
|------|--------|
| AttendeeMap provider | Google Static -> Mapbox Static Images API |
| useGoogleMapsKey hook | Deleted |
| get-google-maps-key edge function | Deleted |
| POI filter coverage | Added medical, industrial, government to hide list |

## What Is NOT Changed

- Map initialization logic
- Route fetching / Directions API
- Route hash memoization
- Clustering
- Theme switching
- Token handling (useMapboxToken)
- Attribution controls
- Camera animations (already match spec)
- Marker styles (already match spec)
- Land/water/road color overrides (already match spec)
- Navigation-night style in TurnByTurnNav
- openDirections helper
- Any backend logic beyond removing the unused edge function

## Expected Result

- 100% Mapbox ecosystem (zero Google dependency for map rendering)
- Brand-consistent static map in AttendeeMap with R@lly orange markers
- Theme-aware static images (light/dark)
- Retina-quality static map (@2x)
- Complete POI filtering for irrelevant categories
- No performance degradation (still a static image, zero WebGL)

