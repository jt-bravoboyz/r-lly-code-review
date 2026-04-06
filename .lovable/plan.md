

# Phase-Specific Plan Editing vs. Going Rogue (Updated)

## Summary
Show "Edit My Plan" during planning phase, "Going Rogue" during live/after_rally, hide both when completed/cancelled. The "Gone Rogue" disabled state is styled as a premium "Badge of Honor."

---

## Changes

### 1. `src/pages/EventDetail.tsx` — Phase-aware button rendering

Replace the current Going Rogue button block with:

- **Scheduled/Upcoming**: Show "Edit My Plan" button (secondary/outline style, Settings2 icon). Clicking silently re-opens `setShowTransportSelector(true)` — no notifications, no alerts. Only visible after user has completed the join flow.
- **Live / After R@lly**: Show `GoingRogueButton` with `hasGoneRogue` from the hook. Rogue success handler resets `joinFlowFiredRef` and invalidates attendee queries to re-trigger safety modal.
- **Completed / Cancelled**: Neither button renders.
- Import `Settings2` from lucide-react.

### 2. `src/components/events/GoingRogueButton.tsx` — Alert styling + Badge of Honor disabled state

**Active state**: Red-tinted alert style — `border-red-500 text-red-500 hover:bg-red-500/10`, flame icon.

**Disabled "Badge of Honor" state** (when `hasGoneRogue` is true):
- Desaturated red with a subtle glow: `border-red-500/30 text-red-400/60 bg-red-500/5 cursor-default`
- Label changes to "Gone Rogue 🔥" with a faint shimmer or inner highlight
- Feels like an earned status badge, not a broken/greyed-out button
- Add `hasGoneRogue` prop, `isPending` prop retained

### 3. `src/hooks/useRogueAlerts.tsx` — Expose `hasGoneRogue` + safety reset

- Compute `hasGoneRogue = alerts.some(a => a.profile_id === profile?.id)` and return it.
- In `goRogue` mutation, after inserting the alert row, UPDATE `event_attendees` to clear: `arrival_transport_mode = null`, `not_participating_rally_home_confirmed = false`, `needs_ride = false`, `location_prompt_shown = false`.

### 4. Database migration — Unique constraint

```sql
ALTER TABLE public.rogue_alerts
  ADD CONSTRAINT rogue_alerts_event_profile_unique UNIQUE (event_id, profile_id);
```

Prevents duplicate rogue alerts per user per event.

---

## Logic Flow Confirmation

| Phase | Button | Action | Notifications |
|---|---|---|---|
| Upcoming (Tue 2pm) | Edit My Plan ⚙️ | Re-opens transport modal silently | None |
| Live (Fri 11pm) | Going Rogue 🔥 | Alert + reactions + safety reset + re-prompt | Global push to squad |
| Post-Rogue (same night) | Gone Rogue 🔥 (badge) | Disabled — premium desaturated red | N/A |
| Completed (Sat 10am) | Hidden | Plan locked for Recap | N/A |

## Files Modified
- `src/pages/EventDetail.tsx` — phase-aware conditional rendering
- `src/components/events/GoingRogueButton.tsx` — red alert style + Badge of Honor disabled state
- `src/hooks/useRogueAlerts.tsx` — `hasGoneRogue` + safety flag reset
- Database migration — unique constraint on `rogue_alerts(event_id, profile_id)`

