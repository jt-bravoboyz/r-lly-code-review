

# Fix: Frictionless Joining for Invitees + DD Passenger Arrival Sync

## Summary
Two fixes: (1) Update `request_join_event` RPC so invited users auto-join as 'attending' instead of 'pending'. (2) Create a database trigger that auto-marks all accepted passengers as arrived when their DD marks arrived — using the DD's exact arrival timestamp for perfect sync.

---

## Changes

### 1. Database Migration — Update `request_join_event` RPC

Modify the existing RPC to check `event_invites` before assigning status. If the joining user has a matching row in `event_invites` (any status), they get `'attending'` instead of `'pending'`. Also auto-accept the invite.

```sql
-- Inside request_join_event, after the host/cohost check:
v_is_invited := EXISTS (
  SELECT 1 FROM event_invites 
  WHERE event_id = p_event_id AND invited_profile_id = v_profile_id
);

v_final_status := CASE 
  WHEN v_is_host THEN 'attending' 
  WHEN v_is_invited THEN 'attending'
  WHEN p_has_invite_code THEN 'attending'
  ELSE 'pending' 
END;

-- After insert, auto-accept the invite record
IF v_is_invited THEN
  UPDATE event_invites 
  SET status = 'accepted', responded_at = now()
  WHERE event_id = p_event_id AND invited_profile_id = v_profile_id AND status = 'pending';
END IF;
```

Add optional `p_has_invite_code boolean DEFAULT false` parameter — when true, status = 'attending'.

### 2. Database Migration — Trigger: DD Arrival Cascades to Passengers

Create a trigger on `event_attendees` that fires on UPDATE. When a DD sets `arrived_safely = true`, cascade to all their accepted passengers — **using `NEW.arrived_at` (the DD's exact arrival timestamp)** instead of `now()`, so the Recap timeline and Admin Analytics are perfectly synced.

```sql
CREATE OR REPLACE FUNCTION public.cascade_dd_arrival_to_passengers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_dd = true 
     AND NEW.arrived_safely = true 
     AND (OLD.arrived_safely IS NULL OR OLD.arrived_safely = false) THEN
    
    UPDATE event_attendees ea
    SET arrived_safely = true,
        arrived_at = NEW.arrived_at,              -- Use DD's exact timestamp
        dd_dropoff_confirmed_at = NEW.arrived_at, -- Same synced timestamp
        dd_dropoff_confirmed_by = NEW.profile_id
    FROM ride_passengers rp
    JOIN rides r ON r.id = rp.ride_id
    WHERE r.event_id = NEW.event_id
      AND r.driver_id = NEW.profile_id
      AND rp.status IN ('accepted', 'confirmed')
      AND ea.event_id = NEW.event_id
      AND ea.profile_id = rp.passenger_id
      AND (ea.arrived_safely IS NULL OR ea.arrived_safely = false)
      -- Exclude rogue users
      AND NOT EXISTS (
        SELECT 1 FROM rogue_alerts ra
        WHERE ra.event_id = NEW.event_id AND ra.profile_id = ea.profile_id
      );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dd_arrival_cascade_passengers
  AFTER UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION cascade_dd_arrival_to_passengers();
```

Key difference from previous version: `arrived_at = NEW.arrived_at` and `dd_dropoff_confirmed_at = NEW.arrived_at` instead of `now()`. This ensures the passenger's arrival time matches the DD's arrival time exactly — no clock drift from trigger processing delay.

### 3. Frontend — `src/pages/JoinRally.tsx`

- Pass `p_has_invite_code: true` to the RPC call
- Update success handling: if result status is `'attending'`, navigate directly to event with "You're in!" toast
- Keep pending path for strangers without invite

### 4. Frontend — `src/components/home/DDArrivedButton.tsx`

No changes needed — the trigger handles the DB cascade automatically. Existing `refetchInterval` on safety queries picks up passenger updates within seconds.

### 5. Historical Data Fix — One-time SQL (via insert tool)

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
  AND dd_ea.is_dd = true
  AND dd_ea.arrived_safely = true
  AND (ea.arrived_safely IS NULL OR ea.arrived_safely = false)
  AND NOT EXISTS (
    SELECT 1 FROM rogue_alerts ra WHERE ra.event_id = ea.event_id AND ra.profile_id = ea.profile_id
  );
```

Also uses `dd_ea.arrived_at` (the DD's recorded timestamp) instead of `now()` — so historical backfill is accurate too.

---

## What Is NOT Touched

| Feature | Status |
|---|---|
| Going Rogue logic | Unchanged — rogue users excluded from DD cascade |
| Safety Reset on Rogue | Unchanged |
| Phase-specific buttons | Unchanged |
| Security hardening (safe_profiles, RLS) | Unchanged |
| Recap screen | Unchanged — already reads `arrived_safely` correctly |
| DD Dropoff Button (manual per-passenger) | Unchanged — still works for individual confirmations |
| Pending approval for strangers (no invite) | Preserved — only invitees/code-holders auto-join |

## Files Modified
- **Database migration**: Updated `request_join_event` RPC + new `cascade_dd_arrival_to_passengers` trigger
- **Edit**: `src/pages/JoinRally.tsx` — pass `p_has_invite_code: true`, update success handling
- **Data fix** (insert tool): Backfill historical passenger arrivals using DD's actual timestamp

