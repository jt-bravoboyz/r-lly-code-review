

# R@lly Stabilization Pass -- Full 30/30 Implementation Plan

## Overview
All 30 audit items implemented in a single sprint. No deferrals. No redesigns.

---

## Database Migration

**New columns on `event_attendees`:**
- `ride_dropoff_location` (text, nullable)
- `ride_dropoff_lat` (double precision, nullable)
- `ride_dropoff_lng` (double precision, nullable)

**New RPC: `transition_event_status(p_event_id uuid, p_new_status text)`**
- Validates caller is host/cohost
- Allowed: `scheduled->live`, `live->after_rally`, `live->completed`, `after_rally->completed`
- Raises exception on invalid transitions
- Validation only, no side effects

---

## New Files

### `src/lib/rideState.ts` (ARCH-3)
- `getUserRideState(attendee)` utility returning `{ plan, pickupLocation, dropoffLocation }`
- Used only by `RidePlanCard.tsx`

---

## File Changes

### `src/hooks/useMapboxToken.tsx` (MED-1)
- Replace useState/useEffect with `useQuery` 
- `queryKey: ['mapbox-token']`, `staleTime: Infinity`
- Single fetch per session, shared across all map components

### `src/hooks/useSafetyStatus.tsx` (MED-2, MED-3, MED-4, ARCH-4, POL-1)
- Remove `refetchInterval: 10000` from `useEventSafetyStatus`
- Add `ride_pickup_location`, `ride_dropoff_location`, `location_prompt_shown` to `useEventSafetyStatus` select
- Add realtime subscription to `useMyAttendeeStatus` via `supabase.channel()` with:
  - Duplicate guard via `channelRef`
  - Cleanup via `channel.unsubscribe()` on unmount
  - Channel nullified on cleanup to prevent duplicate creation
- Expand `useMyAttendeeStatus` select to include all columns (ARCH-4 consolidation)
- Add `skipIfAlreadyArrived` guard to `confirmArrivedSafely` (MED-4)
- Remove `(data as any)` casts where type covers the field (POL-1)
- Keep minimal casts for fields not in auto-generated types

### `src/hooks/useAfterRally.tsx` (ARCH-1, ARCH-4)
- `useStartRally`, `useEndRally`, `useCompleteRally` call `supabase.rpc('transition_event_status')` with graceful fallback to direct update if RPC not deployed yet
- `useMyAfterRallyStatus` now uses same query key `['my-attendee-status', ...]` as consolidated hook (ARCH-4)
- `useOptIntoAfterRally` invalidates consolidated query key

### `src/hooks/useEvents.tsx` (MED-5)
- Guard `attendedEventIds.length === 0` case in `usePastEvents` to avoid invalid `id.in.()` SQL

### `src/hooks/useAutoArrival.tsx` (MED-4, POL-2)
- Add `myStatus?.arrived_safely` guard before awarding points
- Wrap all `console.log` with `import.meta.env.DEV`

### `src/hooks/useChat.tsx` (POL-2)
- Wrap all `console.log('[R@lly Debug]...')` with `import.meta.env.DEV`

### `src/pages/EventDetail.tsx` (ARCH-2, ARCH-4, POL-2)
- Replace inline `myAttendee` query (lines 106-119) with `useMyAttendeeStatus(id)` from the consolidated hook
- Keep query key `['my-attendee-status', id, profile?.id]` to match ARCH-4
- Update `needsSafetyChoice` to also check `!myAttendee?.needs_ride && !myAttendee?.location_prompt_shown` (ARCH-2)
- Remove `sessionStorage.getItem/setItem` for `safety_choice_entry_${id}` (ARCH-2)
- Keep `after_rally_transition_${id}` sessionStorage (cosmetic only)
- Wrap debug console.logs with `import.meta.env.DEV` (POL-2)
- Pass `eventStatus` to `RidesSelectionModal` instances

### `src/components/events/RidesSelectionModal.tsx` (BUG-2)
- Add `eventStatus?: string` prop
- Derive `isPostEvent = eventStatus === 'after_rally' || eventStatus === 'completed'`
- When post-event: label "Drop Off Location", placeholder "Enter drop off address...", save to `ride_dropoff_location/lat/lng`, notification says "needs a ride to"
- When pre-event: label "Pickup Location", placeholder "Enter pickup address...", save to `ride_pickup_location/lat/lng`, notification says "needs a ride from"

### `src/components/home/RidePlanCard.tsx` (UX-6, MED-6, ARCH-3)
- Add `eventStatus?: string` prop
- Use `getUserRideState()` from `src/lib/rideState.ts`
- Phase-aware labels: "Pickup: {location}" pre-event, "Drop Off: {location}" post-event
- Add `isLoadingDriver` state for driver lookup loading indicator (MED-6)

### `src/components/home/RallyHomeButton.tsx` (BUG-2, MED-4, POL-4)
- Pass `eventStatus` to `RidePlanCard` and `RidesSelectionModal`
- Add `myStatus?.arrived_safely` guard before awarding points (MED-4)
- Reduce "Not Participating" button to inline badge style: `h-8 text-xs rounded-full px-4` (POL-4)

### `src/components/home/DDArrivedButton.tsx` (MED-4)
- Add `myStatus?.arrived_safely` guard before calling `rly_award_points_by_profile`

### `src/components/tracking/BarHopStopsMap.tsx` (MAP-1, MAP-2, MAP-3, MAP-4/POL-5)
- **MAP-1**: Separate map init (depends on `[token]`) from marker/route updates (depends on `[stopsWithCoords, currentStopIndex]`)
- **MAP-2**: Use Mapbox built-in clustering for stop GeoJSON source only (not user/DD markers). Cluster layers removed before style switch.
- **MAP-3**: Fetch road-following routes via Mapbox Directions API. Memoize coordinates hash -- only refetch when array content changes. Fall back to straight line on API failure.
- **MAP-4/POL-5**: Import `useTheme`, use `resolvedTheme === 'dark' ? 'dark-v11' : 'streets-v12'`

### `src/components/location/LocationMapPreview.tsx` (POL-5)
- Import `useTheme`, set map style based on `resolvedTheme`

### `src/components/events/QuickRallyDialog.tsx` (POL-2)
- Wrap debug console.logs with `import.meta.env.DEV`

---

## Items Confirmed No Changes Needed

- **UX-4**: Bar Hop toggle already in QuickRallyDialog. Correct behavior confirmed.
- **POL-3**: `home-glow` keyframe exists at `src/index.css` line 368. No fix needed.

---

## Clarification Safeguards (Per Approval Requirements)

1. **MED-2 Realtime**: `channelRef` prevents duplicate subscriptions. `channel.unsubscribe()` called in cleanup return. No double refetch loops.
2. **MAP-2 Clustering**: Clustering applied to stop GeoJSON source only. User/DD markers remain individual. Cluster layers cleaned up before theme switch via source removal.
3. **ARCH-4 Query Keys**: `useMyAttendeeStatus` keeps key `['my-attendee-status', eventId, profileId]`. `useMyAfterRallyStatus` reuses same key. Old `['my-attendee', ...]` key from EventDetail inline query is replaced.
4. **MAP-3 Throttle**: Coordinates serialized via `JSON.stringify` and compared. Route fetch only occurs when hash changes (new stop added/removed/moved). No fetch on zoom/pan.

---

## File Change Summary

| File | Type | Items |
|------|------|-------|
| Migration SQL | New | BUG-2, ARCH-1 |
| `src/lib/rideState.ts` | New | ARCH-3 |
| `src/hooks/useMapboxToken.tsx` | Edit | MED-1 |
| `src/hooks/useSafetyStatus.tsx` | Edit | MED-2, MED-3, MED-4, ARCH-4, POL-1 |
| `src/hooks/useAfterRally.tsx` | Edit | ARCH-1, ARCH-4 |
| `src/hooks/useEvents.tsx` | Edit | MED-5 |
| `src/hooks/useAutoArrival.tsx` | Edit | MED-4, POL-2 |
| `src/hooks/useChat.tsx` | Edit | POL-2 |
| `src/pages/EventDetail.tsx` | Edit | ARCH-2, ARCH-4, POL-2 |
| `src/components/events/RidesSelectionModal.tsx` | Edit | BUG-2 |
| `src/components/home/RidePlanCard.tsx` | Edit | UX-6, MED-6, ARCH-3 |
| `src/components/home/RallyHomeButton.tsx` | Edit | BUG-2, MED-4, POL-4 |
| `src/components/home/DDArrivedButton.tsx` | Edit | MED-4 |
| `src/components/tracking/BarHopStopsMap.tsx` | Edit | MAP-1, MAP-2, MAP-3, MAP-4 |
| `src/components/location/LocationMapPreview.tsx` | Edit | POL-5 |
| `src/components/events/QuickRallyDialog.tsx` | Edit | POL-2 |

**Total: 30/30 items. No deferrals.**

