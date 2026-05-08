## Problems

**1. Aidan (DD) can't see who's in his car.**
`EventDetail.tsx` renders `RiderLine` (waiting/unassigned riders) and `AddPassengerDialog` (picker), but there is no panel that shows the DD their *own accepted passengers*. `RideCard` exists with passenger rendering but is never mounted on the event page.

**2. Aidan keeps getting asked about a safety plan every time he opens the event.**
In `EventDetail.tsx` (lines 241–280), the auto-start join flow fires whenever:
```
hasCompletedJoinFlow = arrival_transport_mode set AND location_prompt_shown
```
A DD setting up via `DDSetupDialog` flips `is_dd=true` and creates a `rides` row, but never sets `arrival_transport_mode` or `location_prompt_shown`. Same for riders who have a `needs_ride=true` row with pickup set — they already have a plan but the flow still re-prompts. Result: the Transport Selector / Safety Choice modal pops on every visit.

## Fix

### A. "My Passengers" panel for the DD

Add a new lightweight component `MyPassengersList` (under `src/components/rides/`) rendered in `EventDetail.tsx` next to `AddPassengerDialog` (around line 1149). It only renders when the current user is a DD for this event with an active `rides` row.

Behavior:
- Query `rides` for `event_id = X AND driver_id = profile.id AND status in ('active','full','paused')` → get `ride.id`.
- Query `ride_passengers` where `ride_id = ride.id AND status = 'accepted'`, selecting `passenger_id, pickup_location, pickup_lat, pickup_lng, status`.
- Resolve names/avatars via a follow-up `safe_profiles` lookup (same pattern we just used in `RiderLine` / `AddPassengerDialog` to bypass the raw `profiles` RLS wall).
- Render a card titled "Your Passengers" with avatar + name + pickup label per row; show seat count "X of Y seats filled". Empty state: "No passengers yet — pick from the Rider Line or Add Passenger."
- Subscribe to `ride_passengers` changes (or just invalidate on `useRides` realtime channel) so JT showing up appears live.

### B. Stop re-prompting users who already have a plan

In `EventDetail.tsx` extend `hasCompletedJoinFlow` so a DD or a rider with a confirmed pickup is considered done:

```ts
const hasRidePlan =
  myAttendee?.is_dd === true ||
  (myAttendee?.needs_ride === true && !!myAttendee?.ride_pickup_location);

const hasCompletedJoinFlow =
  hasRidePlan ||
  (hasTransportModeForEvent && Boolean(myAttendee?.location_prompt_shown));
```

Also gate `shouldAutoStartJoinFlow` on `!hasRidePlan` so the Transport Selector never auto-opens for a DD or a rider with a pickup. The user can still manually edit their plan via the existing DD/Rider buttons.

Additionally, in `DDSetupDialog` (around line 230 where it sets `is_dd: true`), also write:
```ts
arrival_transport_mode: 'driving',
location_prompt_shown: true,
```
on that same `event_attendees` update. This makes the "completed plan" state durable and consistent with the rest of the join-flow gating logic, so even older code paths checking those flags treat the DD as set.

Mirror the same in `RequestRideDialog` when a rider successfully creates their `needs_ride` row with a pickup: set `arrival_transport_mode: 'rider'` and `location_prompt_shown: true` so they aren't re-prompted either.

### C. No DB migration needed
All changes are client-side reads/updates to existing columns. The `safe_profiles` view + `ride_passengers` / `rides` / `event_attendees` policies already permit the queries we need.

## Files touched
- `src/components/rides/MyPassengersList.tsx` (new)
- `src/pages/EventDetail.tsx` (mount component; extend `hasCompletedJoinFlow` / `shouldAutoStartJoinFlow`)
- `src/components/rides/DDSetupDialog.tsx` (also write `arrival_transport_mode`, `location_prompt_shown`)
- `src/components/rides/RequestRideDialog.tsx` (same two fields after pickup confirmed)
