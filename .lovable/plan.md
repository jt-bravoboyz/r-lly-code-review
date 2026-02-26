

# R@lly Hardening Pass -- 4 Required Fixes

## Fix 1: RPC Hardening (Critical) -- Database Migration

Create a new migration that replaces `transition_event_status` with hardened version and locks down execution.

**SQL changes:**
- Add `IF p_new_status IS NULL THEN RAISE EXCEPTION` at the top of the function body
- Add status value whitelist check: `IF p_new_status NOT IN ('scheduled','live','after_rally','completed')`
- Replace plain `SELECT status INTO v_current_status` with `SELECT status INTO v_current_status ... FOR UPDATE` to lock the row during transition
- After function creation: `REVOKE ALL ON FUNCTION ... FROM PUBLIC` and `GRANT EXECUTE ... TO authenticated`

The full function body remains identical in structure -- only these 4 additions are inserted.

---

## Fix 2: Remove RPC Fallback (High) -- useAfterRally.tsx

**File:** `src/hooks/useAfterRally.tsx`

Replace the `transitionStatus` function (lines 34-59) with a direct RPC call that has no try/catch fallback:

```typescript
async function transitionStatus(eventId: string, newStatus: string) {
  const { data, error } = await supabase.rpc('transition_event_status', {
    p_event_id: eventId,
    p_new_status: newStatus,
  });
  if (error) throw error;
  return data;
}
```

Remove the comment about "graceful fallback". The RPC is deployed and hardened -- no dual path.

---

## Fix 3: Map Theme Switch Layer Fix (Medium) -- BarHopStopsMap.tsx

**File:** `src/components/tracking/BarHopStopsMap.tsx`

Add `mapStyle` to the dependency array of the marker/route update effect (line 211):

```
}, [stopsWithCoords, currentStopIndex, token, mapStyle]);
```

This ensures that when `setStyle()` fires (from the theme effect at line 74), the marker/route effect re-runs. The existing `style.load` guard at lines 206-210 already handles waiting for the new style to finish loading before re-adding layers, so no additional logic is needed -- just the dependency.

Also reset the `routeCoordsHashRef` when theme changes so the route source is re-added:

In the theme change effect (lines 72-75), add `routeCoordsHashRef.current = '';` after `setStyle()`.

---

## Fix 4: MAP-2 Clustering -- BarHopStopsMap.tsx

**File:** `src/components/tracking/BarHopStopsMap.tsx`

Add a GeoJSON source with clustering enabled for stops, alongside the existing individual markers. This provides automatic grouping when stops overlap at lower zoom levels.

**Implementation approach:**
- After markers are placed, add a `stops-cluster` GeoJSON source with `cluster: true, clusterMaxZoom: 14, clusterRadius: 50`
- Add `clusters` circle layer and `cluster-count` symbol layer
- Before adding cluster source/layers, clean up any existing ones (handles theme switch case)
- Individual markers remain as-is (they provide the custom styled elements). The cluster source provides automatic grouping only when multiple stops overlap.
- User/DD markers are NOT part of this source -- clustering applies to stops only.

**Cleanup on theme switch:**
The theme effect resets `routeCoordsHashRef` (from Fix 3), and the marker/route effect already clears markers and re-adds everything. The cluster source/layers are removed and re-added in the same flow via explicit cleanup at the top of `updateMarkersAndRoute`.

---

## File Change Summary

| File | Fix | Type |
|------|-----|------|
| New migration SQL | Fix 1: RPC hardening | Database |
| `src/hooks/useAfterRally.tsx` | Fix 2: Remove fallback | Edit (lines 31-59) |
| `src/components/tracking/BarHopStopsMap.tsx` | Fix 3 + Fix 4: Theme layers + clustering | Edit |

**No new dependencies. No new files. No UX changes. Hardening only.**
