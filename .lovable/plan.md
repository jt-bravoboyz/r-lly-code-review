

# Data Connection & Metric Backfill (Revised)

## Current State (from DB query)

**Events needing status fix** (past but still `scheduled`):
- "Hanks" (3/28, Sko) — `scheduled` → needs `completed`
- "Kincades" (3/28, Nick) — `scheduled` → needs `completed`
- "drinks on main" (3/30, Jazmin) — `scheduled` → needs `completed`
- "friday night" (4/4, Jazmin) — `scheduled` → needs `completed`

**Caroline's events** — all 4 already `completed`: "WHIMSY KNIGHT OUT" (3/28), "hail mary or wtv" (3/31), "j's and jokes" (3/31), "a fucking break from hell." (4/2). No status fix needed.

**Attendee gap**: Nick is NOT in "Boyz Morning Out" — needs to be added. No other cross-attendance inserts needed per your instructions.

## Data Operations (via insert tool)

### 1. Add Nick to "Boyz Morning Out"
Insert `event_attendees` row for Nick (profile `323b2d86`) → event `7c4d13ba` with `status = 'attending'`, `arrived_safely = true` (since the event is completed).

### 2. Close out past events still marked `scheduled`
Update `events.status` to `'completed'` for:
- Hanks (`31487dd8`)
- Kincades (`d099836c`)
- drinks on main (`1b231048`)
- friday night (`d3af835a`)

### 3. Safety backfill for completed events
For all attendees on newly-completed events (Hanks, Kincades) + Caroline's events, set `arrived_safely = true` and `going_home_at` to the event date. This populates Safety Rate metrics.

### 4. Analytics events backfill
Insert `event_joined`, `invite_link_copied`, and `safety_confirmed` rows into `analytics_events` for Nick, JT, Sko on the events they attended, and for Caroline on her events. This activates Growth Metrics, K-Factor, and Conversion Rate charts.

### 5. No code changes
The Admin Portal already reads from these tables — data will reflect on next load.

## Files Modified
None — entirely data operations via insert tool.

