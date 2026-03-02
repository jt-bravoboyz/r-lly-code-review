

# R@lly Map Refinement -- 3 Defensive Safeguards

These are additive safeguards layered into the existing approved refinement plan. No design changes -- only defensive engineering.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/mapStyles.ts` | **NEW** -- Updated `applyRallyMapOverrides()` with all 3 safeguards built in |
| `src/components/tracking/BarHopStopsMap.tsx` | Route layer ordering, marker CSS, POI overrides, popup, camera, flyTo |
| `src/components/location/LocationMapPreview.tsx` | Marker CSS, POI overrides, flyTo duration |

---

## Safeguard 1: Composable POI Filter

Instead of replacing `poi-label` filter outright, compose with the existing filter:

```typescript
// Inside applyRallyMapOverrides()
const nightlifeFilter = ["match", ["get", "class"], 
  ["food_and_drink", "entertainment"], true, false];

map.getStyle().layers.forEach(layer => {
  if (layer.type === 'symbol' && layer.id.includes('poi')) {
    const existing = map.getFilter(layer.id);
    map.setFilter(layer.id, existing 
      ? ["all", existing, nightlifeFilter] 
      : nightlifeFilter
    );
  }
});
```

This preserves Mapbox's internal zoom-level conditions and label collision logic while layering our brand filtering on top. Applied to ALL poi-related symbol layers, not just `poi-label`.

---

## Safeguard 2: Pattern-Based Layer Detection

Instead of hardcoded layer IDs like `land`, `water`, `road-primary`, use pattern matching:

```typescript
map.getStyle().layers.forEach(layer => {
  // Land layers
  if (layer.type === 'background') {
    map.setPaintProperty(layer.id, 'background-color', colors.land);
  }
  // Water layers
  if (layer.id.includes('water') && layer.type === 'fill') {
    map.setPaintProperty(layer.id, 'fill-color', colors.water);
  }
  // Road layers
  if (layer.id.includes('road') && layer.type === 'line') {
    map.setPaintProperty(layer.id, 'line-color', colors.road);
  }
  // Transit/parking -- hide
  if (layer.id.includes('transit') || layer.id.includes('airport') || layer.id.includes('parking')) {
    map.setLayoutProperty(layer.id, 'visibility', 'none');
  }
});
```

This survives Mapbox style version updates (e.g., `dark-v12` renaming `poi-label` to `poi-label-major`). No `getLayer()` checks needed since we're iterating actual layers.

---

## Safeguard 3: Explicit Route Layer Stacking

When adding dual route layers in `BarHopStopsMap.tsx`, anchor them below the cluster layer using `addLayer`'s `beforeId` parameter:

```typescript
// Find a suitable anchor layer (clusters or first symbol layer)
const anchorLayer = map.getLayer('clusters') 
  ? 'clusters' 
  : map.getStyle().layers.find(l => l.type === 'symbol')?.id;

map.addLayer({
  id: 'route-glow',
  type: 'line',
  source: 'route',
  paint: { 'line-color': '#4B2E83', 'line-width': 12, 'line-opacity': 0.3, 'line-blur': 2 }
}, anchorLayer);

map.addLayer({
  id: 'route',
  type: 'line',
  source: 'route',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: { 'line-color': '#5B2D8C', 'line-width': 5, 'line-opacity': 0.95 }
}, anchorLayer);
```

Stacking order guaranteed:
- Base roads (bottom)
- `route-glow` (above roads)
- `route` (above glow)
- `clusters` / `cluster-count` (above routes)
- DOM markers (always on top, outside GL layer stack)

On theme switch (`setStyle`), `routeCoordsHashRef` is already reset, so layers are re-added in correct order.

---

## Implementation Sequence

1. Create `src/lib/mapStyles.ts` with `applyRallyMapOverrides(map, theme)` containing safeguards 1 and 2
2. Update `BarHopStopsMap.tsx`: import helper, call on `style.load`, apply safeguard 3 to route layer adds, update marker CSS/popup/camera/flyTo
3. Update `LocationMapPreview.tsx`: import helper, call on map load, update marker CSS and flyTo duration

---

## What Is NOT Changed

- Map initialization logic
- Route hash memoization / Directions API fetching
- Clustering source/radius/maxZoom
- Realtime subscriptions
- Theme switching mechanism (`setStyle` + `routeCoordsHashRef` reset)
- `TurnByTurnNav.tsx`
- Any database or RPC

