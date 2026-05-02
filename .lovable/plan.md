## Fix: Past R@llies redirect to /events

### Root cause (confirmed against the live DB)

`get_event_safe(uuid)` and `list_events_safe()` are declared `RETURNS SETOF events`, but their `SELECT` lists the columns in the wrong order. PostgreSQL maps `SETOF events` rows **positionally**, not by name. The `events` table order is:

```text
id, creator_id, title, description, event_type, image_url, start_time,
end_time, location_name, location_lat, location_lng, is_barhop,
max_attendees, created_at, updated_at, invite_code, is_quick_rally,
status, after_rally_location_name, after_rally_location_lat,
after_rally_location_lng, cover_charge, split_check,
after_rally_stealth, after_rally_invited_ids
```

The current RPCs select in a different order — so `start_time` (timestamptz) lands in the `is_barhop` (boolean) slot, the function errors, returns zero rows, and `useEvent` returns `null`. `EventDetail` then falls into `if (!event) return <Navigate to="/events" />` — which is exactly what's happening when the user opens any past R@lly. That redirect also causes the render-loop warning and the React Router `Navigate` ref warning.

### Fix

**1. Migration** — `CREATE OR REPLACE` both functions with the SELECT columns in the exact positional order of the `events` table above. Keep all the existing stealth-mask `CASE` expressions (status downgrade to `completed`, null After R@lly location, empty invite list for non-invited viewers) — just move them into the correct slots.

**2. No client changes required** — `useEvents` and `useEvent` already call these RPCs. Once the function returns properly shaped rows, EventDetail renders past R@llies again and the redirect loop stops on its own.

### Verification

- `select start_time from get_event_safe('<past event id>')` returns a real timestamp instead of erroring.
- Tapping a past R@lly from the Past R@llies feed loads the detail page (no redirect).
- Stealth: a non-invited viewer still sees `status='completed'` and null After R@lly location/invite list.
- Video grid posters (`#t=0.001` fix) and 24h Final Cut window are unaffected.