

# Rider Setup Overhaul + "Going Rogue" Mechanic

## Summary
Two features: (1) Replace the current ride request flow in `RidesSelectionModal` with a two-step tactile selection + "Locked In" celebration screen, and (2) Add a "Going Rogue" button to live events with a full-screen alert, persistent emoji reactions, "Final Words" input, and recap integration.

---

## Part 1: Rider Setup Overhaul

### Changes to `src/components/events/RidesSelectionModal.tsx`
- Replace the single `'choice' | 'request-ride'` view state with `'choice' | 'meeting-or-pickup' | 'destination-choice' | 'pickup-location' | 'locked-in'`
- **Step 1 — "Meeting or Pickup"**: Two large tactile buttons (h-28, full-width):
  - "Meeting at their place" — skips pickup location entry, marks `ride_pickup_location = event location`
  - "Pick me up" — proceeds to pickup location entry
- **Step 2 — "Destination Choice"** (after pickup selection): Two buttons:
  - "R@lly Home" — auto-fills destination from `profile.home_address` / `profile.home_lat/lng`
  - "Other Location" — shows the existing `LocationSearch` input
- **Step 3 — "Locked In" screen**: Full-screen celebration with:
  - Random hype quote from a curated list (e.g., "The horse is prepared for battle", "You're locked in twin", "Tonight's gonna be legendary")
  - `animate-scale-in` + `animate-fade-in` combined animation
  - Auto-dismiss after 2.5 seconds, then calls `onComplete`
- Button styling: large tactile cards with `hover:scale-[1.02] active:scale-[0.97]` transitions

### No database changes needed — uses existing `ride_pickup_location`, `ride_dropoff_location`, and `needs_ride` columns.

---

## Part 2: "Going Rogue" Mechanic

### Database Migration
1. **New table: `rogue_alerts`**
   - `id` UUID PK
   - `event_id` UUID NOT NULL
   - `profile_id` UUID NOT NULL (the rogue user)
   - `final_words` TEXT (optional message)
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - RLS: event members can SELECT; user can INSERT own; no UPDATE/DELETE
   - Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.rogue_alerts;`

2. **New table: `rogue_reactions`**
   - `id` UUID PK
   - `rogue_alert_id` UUID NOT NULL (references `rogue_alerts.id`)
   - `profile_id` UUID NOT NULL (reactor)
   - `emoji` TEXT NOT NULL (one of 🤮, 😍, 🍆)
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - UNIQUE constraint on `(rogue_alert_id, profile_id)` — one reaction per person
   - RLS: event members can SELECT via join to rogue_alerts; user can INSERT/UPDATE own
   - Enable realtime

### New Component: `src/components/events/GoingRogueButton.tsx`
- Orange-outlined button with a flame/skull icon: "I'm Going Rogue 🔥"
- On click: opens a confirmation dialog with optional "Final Words" textarea
- On confirm: inserts into `rogue_alerts`, triggers push notification via `send-event-notification`

### New Component: `src/components/events/RogueAlertOverlay.tsx`
- Full-screen overlay that appears for all participants via Supabase Realtime subscription on `rogue_alerts`
- Displays: rogue user's avatar, name, "Final Words" quote
- Bold animated entrance (scale + fade, maybe a shake effect)
- **Floating Reaction Bar**: Three emoji buttons (🤮, 😍, 🍆) pinned at bottom
  - On tap: upserts into `rogue_reactions`
  - Shows real-time reaction counts via Realtime subscription on `rogue_reactions`
- Auto-dismisses after 10 seconds or on tap-away

### New Hook: `src/hooks/useRogueAlerts.tsx`
- Subscribes to `rogue_alerts` for a given `eventId` via Realtime
- Queries existing rogue alerts and reactions
- Exposes `latestAlert`, `reactions`, `submitReaction`, `goRogue` mutations

### Integration in `src/pages/EventDetail.tsx`
- Add `GoingRogueButton` to the live event view (visible when `isLive || isAfterRally` and `isAttending`)
- Mount `RogueAlertOverlay` to listen for incoming rogue alerts
- Position the button in the action area near the primary action bar

### Recap Integration
- In `RallyCompleteOverlay.tsx` or `RallyRecapCard.tsx`: query `rogue_alerts` + `rogue_reactions` for the event and display a "Rogue Moments" section showing who went rogue, their final words, and reaction tallies

---

## Files Created
- `src/components/events/GoingRogueButton.tsx`
- `src/components/events/RogueAlertOverlay.tsx`
- `src/hooks/useRogueAlerts.tsx`
- Database migration (2 new tables + RLS + realtime)

## Files Modified
- `src/components/events/RidesSelectionModal.tsx` — multi-step flow + locked-in screen
- `src/pages/EventDetail.tsx` — mount GoingRogueButton + RogueAlertOverlay
- `src/components/events/RallyRecapCard.tsx` — add Rogue Moments section

No changes to auth, squad media, contacts, badges, or existing database tables.

