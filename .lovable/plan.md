

# Plan: Hide Event Details Block on Completed R@llies

## Problem
When viewing a past (completed) R@lly, the full event header — title, map, date, location, attendee count, host info, invite link — all renders above the Recap. This info is useless for completed events and pushes the Recap down.

## Fix

### `src/pages/EventDetail.tsx`

Wrap the event header card (the `<div className="rounded-2xl bg-card/50 ...">` block, lines 425–760) in a condition so it only renders when the event is **not** completed.

For completed events, show a minimal header instead: just the back button, the event title, and a "Completed" badge — then immediately render the `RallyRecapScreen`.

Specifically:
1. **Keep** the back button (line 412) and hero media carousel (line 419) for all states
2. **Wrap** lines 424–760 (the entire `<div className="rounded-2xl bg-card/50 ...">` block) in `{!isCompleted && (...)}` 
3. **Add** a slim completed header before the Recap: just the event name + "Completed" badge so users know which R@lly they're viewing

This is a single conditional wrap — no component changes, no data changes, no security changes.

## What Is NOT Touched
| Feature | Status |
|---|---|
| RecapTour / RecapTimeline | Unchanged |
| Active/Live event layout | Unchanged |
| Safety tracking | Unchanged |
| All other pages | Unchanged |

## Files Modified
- **Edit**: `src/pages/EventDetail.tsx` — conditionally hide event details block for completed events, add minimal title header

