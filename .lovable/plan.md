

# Fix: Rider Stays in Line After Acceptance + Safety Re-prompt

## Root Causes

### Issue 1 — Rider stays in Rider Line after DD picks them
The `RiderLine` query has two sources:
- **Source 1**: `ride_passengers` with `status = 'pending'` — correctly excludes accepted riders
- **Source 2**: `event_attendees` with `needs_ride = true` — does NOT check if the rider already has an `accepted` ride_passengers entry

When `handlePick` runs, it sets `needs_ride = false` and updates/inserts the ride_passengers row. But there's a race: the `needs_ride = false` UPDATE on `event_attendees` happens *after* the ride_passengers insert, and the query has a 10-second refetch interval. If either update is slow or the cache isn't invalidated in time, the rider persists.

Additionally, Source 2 has no fallback check — if `needs_ride` fails to clear (network issue, RLS, etc.), the rider stays in the line permanently.

**Fix**: Add a secondary exclusion filter to the query. After gathering riders from both sources, exclude any `profile_id` that already has an `accepted` ride_passengers entry on any ride in this event. This is a belt-and-suspenders approach that makes the Rider Line self-correcting regardless of `needs_ride` flag state.

### Issue 2 — Safety choices re-prompted
The current guard at line 201 checks `!isLoadingMyAttendee`, which was just added. But there's another gap: `shouldAutoStartJoinFlow` also requires `!hasTransportModeForEvent` (line 204). The realtime subscription on `event_attendees` invalidates the `my-attendee-status` query whenever the row changes. When the DD picks the rider, `needs_ride` is updated on the rider's attendee row, which triggers a realtime event → query invalidation → brief refetch where `myAttendee` transiently returns the previous data. During this window, `hasTransportModeForEvent` evaluates correctly (it has the cached data). However, the `useEffect` at line 213-219 fires on *every* re-evaluation of `shouldAutoStartJoinFlow` going from false→true→false if there's a render cycle gap.

**Fix**: Add a ref-based guard so the join flow useEffect only fires *once per mount* (or once per event ID). If the user has already completed the flow (DB flags are set) or dismissed it, the effect never re-triggers even if there's a transient data gap.

---

## Changes

### 1. `src/components/rides/RiderLine.tsx` — Exclude accepted riders from both sources

In the query function, after collecting riders from Source 1 and Source 2, fetch all `accepted` ride_passengers for this event and filter them out:

```typescript
// After gathering riders from both sources, exclude anyone already accepted
const { data: acceptedPassengers } = await supabase
  .from('ride_passengers')
  .select('passenger_id')
  .in('ride_id', rideIds)
  .eq('status', 'accepted');

const acceptedSet = new Set((acceptedPassengers || []).map(a => a.passenger_id));
return riders.filter(r => !acceptedSet.has(r.passengerId));
```

This ensures that even if `needs_ride` wasn't cleared, or there's a pending row on another ride, an already-accepted rider never appears in the line.

### 2. `src/pages/EventDetail.tsx` — One-shot join flow guard

Add a ref (`joinFlowFiredRef`) that tracks whether the join flow has already been triggered for this event session. Once the effect fires and opens the modal, or once `hasCompletedJoinFlow` is true on first load, the ref is set and the effect never re-triggers:

```typescript
const joinFlowFiredRef = useRef(false);

useEffect(() => {
  // Reset on event change
  joinFlowFiredRef.current = false;
}, [id]);

useEffect(() => {
  if (joinFlowFiredRef.current) return;
  if (hasCompletedJoinFlow) {
    joinFlowFiredRef.current = true;
    return;
  }
  if (shouldAutoStartJoinFlow && !showTransportSelector && !showSafetyChoice && !showRidesSelection && !showLocationSharingModal) {
    joinFlowFiredRef.current = true;
    const timer = setTimeout(() => {
      setShowTransportSelector(true);
    }, 500);
    return () => clearTimeout(timer);
  }
}, [shouldAutoStartJoinFlow, hasCompletedJoinFlow, ...]);
```

This guarantees the modal opens at most once per page visit, regardless of data refetches or transient states.

---

## Risk Assessment

| Concern | Risk |
|---|---|
| Breaks existing Rider Line display? | No — only adds an exclusion filter after data is already gathered |
| Breaks ride request flow? | No — pending riders still appear; only accepted ones are hidden |
| Breaks safety/transport setup for new attendees? | No — the ref only prevents *re-triggering*; first-time users still get the flow |
| Performance? | Negligible — one extra small query (accepted passengers) on a 10s interval |

## Files Modified
- `src/components/rides/RiderLine.tsx` — add accepted-rider exclusion filter
- `src/pages/EventDetail.tsx` — add ref guard for one-shot join flow trigger

