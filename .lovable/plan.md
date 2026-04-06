

# Fix: Safety Setup Shown Twice & DD Can't Pick Riders

## What's Wrong

**Issue 1 — Safety setup modal fires twice:**
In `EventDetail.tsx` line 135, `useMyAttendeeStatus` returns `data: myAttendee` but the loading state is not checked. On initial render, `myAttendee` is `undefined` while the query is still fetching — so `shouldAutoStartJoinFlow` (line 201) evaluates to `true` and the 500ms timer fires the transport selector modal before the DB record loads. Once the data arrives showing the flow was already completed, it's too late — the modal already opened.

**Issue 2 — Thermus can't pick you (RLS block):**
When a DD clicks "Pick" on a rider in `RiderLine.tsx` (lines 270-297), it inserts a `ride_passengers` row with the *rider's* `passenger_id`. But the only INSERT policy on `ride_passengers` requires `passenger_id` to match the current user's profile. So a DD inserting someone else as a passenger is blocked by RLS.

## What Will Change (and nothing else)

### 1. EventDetail.tsx — Add loading guard (1 line changed, 1 line added)

**Line 135**: Destructure `isLoading` alongside `data` and `refetch`:
```ts
const { data: myAttendee, refetch: refetchMyAttendee, isLoading: isLoadingMyAttendee } = useMyAttendeeStatus(id);
```

**Line 201**: Add `!isLoadingMyAttendee` to the condition:
```ts
const shouldAutoStartJoinFlow = isAttending &&
  !isLoadingMyAttendee &&
  !hasCompletedJoinFlow &&
  ...
```

This is purely additive — no other logic, state, or component is affected. The modal simply won't evaluate until the DB query finishes.

### 2. Database Migration — New RLS INSERT policy on `ride_passengers`

Add one new policy that allows drivers to insert passengers into their own rides:

```sql
CREATE POLICY "Drivers can add passengers to their rides"
ON public.ride_passengers
FOR INSERT
TO authenticated
WITH CHECK (
  ride_id IN (
    SELECT r.id FROM rides r
    WHERE r.driver_id IN (
      SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
    )
  )
);
```

This does NOT modify or replace any existing policy. The existing "Users can request rides" policy continues to work for self-inserts. This new policy simply adds a second valid path for drivers.

## Risk Assessment

| Concern | Risk |
|---|---|
| Breaks other modals? | No — only `shouldAutoStartJoinFlow` is touched, and only by adding a guard |
| Breaks existing ride requests? | No — existing INSERT policy is untouched; new policy is additive |
| Security risk? | No — drivers can only add passengers to rides they own |
| Performance? | No — `isLoading` is already computed by react-query, just not destructured |

## Files Modified
- `src/pages/EventDetail.tsx` — 2 lines changed (destructure `isLoading`, add to condition)
- **Database migration** — 1 new RLS INSERT policy on `ride_passengers`

No other files are touched.

