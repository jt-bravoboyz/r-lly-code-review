

# R@lly Phase 3 -- Differentiation & Moat Expansion

All structural risks verified. Proceeding with implementation.

---

## 1. RallyCompleteOverlay Recap Screen

**File:** `src/components/events/RallyCompleteOverlay.tsx`

- Extend props to accept `attendeeCount` and `ddCount` (both optional, default 0)
- After existing "Mission complete." heading, add a recap block:
  - "{attendeeCount} confirmed" 
  - "{ddCount} DDs deployed" (only if ddCount > 0)
  - "100% accounted for"
- Add `<Progress value={100} />` bar below the recap for visual closure
- Change auto-navigate timer from 2000ms to 5000ms

**File:** `src/pages/EventDetail.tsx`

- Pass `attendeeCount` and `eventDDs?.length ?? 0` to the overlay component

---

## 2. HostSafetyDashboard Elevation

**File:** `src/components/home/HostSafetyDashboard.tsx`

- Rename header from "Safety Dashboard" to "R@lly Home Command"
- Add completion counter subtitle using existing computed values: `"{arrivedSafely} of {total} confirmed safe"`

---

## 3. Safety Completion Badge in Event Header

**File:** `src/pages/EventDetail.tsx`

- Add `useIsEventSafetyComplete(id)` call -- verified: React Query, stable key `['event-safety-status', eventId]`, shared cache, no redundant requests
- Render green badge below event title when `isAfterRally && safetyComplete`:
  ```
  [CheckCircle2 icon] Everyone made it home safe
  ```

---

## 4. Onboarding Microcopy

**File:** `src/components/Onboarding.tsx`

- Update slide 1 description from "Create and join events on the fly with friends nearby" to "Plan it. Rally up. Get everyone home safe."

---

## 5. Profile Badge -- SKIPPED

No host-count query exists on the Profile page. Skipped per guardrail.

---

## Structural Safety

- No new useState: PASS
- No new useEffect: PASS  
- No new mutations/RPCs: PASS
- No schema changes: PASS
- Hook reuse verified: useIsEventSafetyComplete shares React Query cache with key `['event-safety-status', eventId]` -- zero redundant calls: PASS

