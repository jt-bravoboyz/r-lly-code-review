

# Combined Plan: Frictionless Joining + DD Sync + Premium Rider Flow + DD Notifications

## Summary
Merge two plans into one implementation pass: (1) Database fixes for frictionless invite joining and DD→passenger arrival cascade, (2) Frontend enhancements for hype quotes, quick-select pickup, squad notifications, DD departure alerts, and After R@lly re-prompt skip.

---

## What's Already Built (No Changes Needed)
- Rider flow with big tactile buttons (meeting/pickup, destination choice)
- Locked-in hype screen with animation
- R@lly Home button on active event screen
- Photo bundle split (featured vs gallery)
- Rogue reactions saved for Recap
- Going Rogue safety reset + once-per-event constraint
- `request_join_event` RPC updated with `p_has_invite_code` parameter (already deployed)
- `cascade_dd_arrival_to_passengers` trigger (already deployed)
- `JoinRally.tsx` already passes `p_has_invite_code: true` and handles attending/pending split

---

## Changes

### 1. Expand Hype Quotes — `src/components/events/RidesSelectionModal.tsx`
Replace the 8-entry `HYPE_QUOTES` array with the user's custom quotes plus originals:
- "Motion detected. The takeover begins now 🚀"
- "Secure the bag. Secure the ride. Secure the night 🔒"
- "YKYK. And now we know 😏"
- "Bet. The night is ours 🌙"
- "Vibe: Validated ✅"
- "Coordinate the chaos. Execute the plan 🎯"
- "Safe and sound? No. Safe and legendary 🌟"
- "Put the team on your back. It's light work 💪"
- "The pity party is over. Now let's go 🔥"
- "Main character energy activated 💫"
- Plus the existing 8 quotes retained

### 2. Add Quick-Select Pickup Buttons — `src/components/events/RidesSelectionModal.tsx`
In the `pickup-location` view, add two big tactile buttons ABOVE the LocationSearch:
- **"📍 Current Location"** — `navigator.geolocation.getCurrentPosition()` → reverse-geocode via Mapbox for display name
- **"🏠 Home"** — pre-fill from `profile.home_address` / `profile.home_lat` / `profile.home_lng`
- Same `h-28` button style as the meeting-or-pickup step
- LocationSearch remains below as fallback for custom addresses

### 3. Squad-Select Notify — `src/components/home/RallyHomeButton.tsx`
After the visibility radio group, add:
- "Notify My Squad" toggle (default on)
- When on, show dropdown of user's squads (from `squad_members` + `squads`)
- Selected squad members get push notification via `send-event-notification` with type `going_home`

### 4. DD Departure Alert to Passengers — `src/components/home/RallyHomeButton.tsx`
In `handleStartJourney`, check if user `is_dd`. If so:
- Query `ride_passengers` for accepted passengers in their rides for this event
- Send high-priority push: "🚗 Your DD [Name] is heading out! Get ready."
- Use existing `send-event-notification` edge function with `targetProfileIds`

### 5. Skip After R@lly Re-Prompt — `src/pages/EventDetail.tsx`
In the `AfterRallyOptInDialog` trigger effect:
- Also check `myAttendee?.not_participating_rally_home_confirmed` — if true, skip dialog
- If user has `is_dd = true` or `needs_ride = true`, auto-opt-in to After R@lly without re-asking

### 6. Historical Data Backfill — One-time SQL
Run via database tool to fix passengers whose DD already arrived but weren't synced:
```sql
UPDATE event_attendees ea
SET arrived_safely = true,
    arrived_at = dd_ea.arrived_at,
    dd_dropoff_confirmed_at = dd_ea.arrived_at,
    dd_dropoff_confirmed_by = dd_ea.profile_id
FROM event_attendees dd_ea
JOIN rides r ON r.driver_id = dd_ea.profile_id AND r.event_id = dd_ea.event_id
JOIN ride_passengers rp ON rp.ride_id = r.id AND rp.status IN ('accepted','confirmed')
WHERE ea.event_id = dd_ea.event_id
  AND ea.profile_id = rp.passenger_id
  AND dd_ea.is_dd = true AND dd_ea.arrived_safely = true
  AND (ea.arrived_safely IS NULL OR ea.arrived_safely = false)
  AND NOT EXISTS (
    SELECT 1 FROM rogue_alerts ra
    WHERE ra.event_id = ea.event_id AND ra.profile_id = ea.profile_id
  );
```
Uses DD's actual `arrived_at` timestamp for accurate historical data.

---

## No Database Migration Required
The `request_join_event` RPC update and `cascade_dd_arrival_to_passengers` trigger are already deployed. All tables support the frontend changes.

## Files Modified
- **Edit**: `src/components/events/RidesSelectionModal.tsx` — expanded hype quotes, Current Location / Home pickup buttons
- **Edit**: `src/components/home/RallyHomeButton.tsx` — squad-select notify, DD departure alert
- **Edit**: `src/pages/EventDetail.tsx` — skip After R@lly re-prompt when plan already set
- **Data fix**: One-time SQL backfill for historical passenger arrivals

## What Is NOT Touched
| Feature | Status |
|---|---|
| Going Rogue logic | Unchanged |
| Photo bundle split | Already done |
| Rogue reactions in chat | Already done |
| DD arrival cascade trigger | Already deployed |
| Security hardening (safe_profiles, RLS) | Unchanged |
| R@lly Recap | Unchanged |
| Frictionless invite joining (RPC + JoinRally.tsx) | Already deployed |

