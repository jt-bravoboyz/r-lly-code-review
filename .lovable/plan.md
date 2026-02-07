
# Plan: Add After R@lly Feature Card Below R@lly Home Button

## Overview

Add a dedicated "After R@lly" interactive card below the existing "R@lly Home" button on the EventDetail page. This card will:
1. Allow attendees to join the After R@lly if the event is in `after_rally` status
2. Show their opt-in status (joined vs. not joined)
3. Display the After R@lly location set by the host
4. Provide navigation to the After R@lly location

---

## Current After R@lly Features (Already Implemented)

Based on my exploration, the After R@lly mode includes:

| Feature | Status | Location |
|---------|--------|----------|
| Status transition (live → after_rally) | Done | `EndRallyDialog.tsx`, `useAfterRally.tsx` |
| Host sets After R@lly location | Done | `EndRallyDialog.tsx` |
| Opt-in dialog for attendees | Done | `AfterRallyOptInDialog.tsx` |
| Purple "night mode" theme with Dusk→Midnight transition | Done | `index.css`, `useAfterRallyTransition.tsx` |
| "After R@lly Mode" banner at top | Done | `EventDetail.tsx` (lines 514-536) |
| Header badge "🌙 After R@lly" | Done | `Header.tsx` |
| Safety tracking continues | Done | `SafetyTracker.tsx` |

---

## What's Missing

There's no dedicated **interactive card** below the R@lly Home button that allows users to:
- See and quickly join After R@lly (if they haven't yet)
- View the After R@lly location with navigation
- See their current status (opted-in vs. not)

---

## Proposed Solution

### New Component: `AfterRallyCard.tsx`

Create a new card component that displays contextually based on event and user status:

```text
┌─────────────────────────────────────────────┐
│  [Moon Icon]   After R@lly                  │
│                                             │
│  📍 Next stop: Denny's on Main St           │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │    [Join After R@lly]  (purple btn) │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Get Directions →]                         │
└─────────────────────────────────────────────┘
```

### States the Card Should Handle

1. **Event is in `after_rally` status + User has NOT opted in**
   - Show "Join After R@lly" button
   - Show location card
   - Show "Get Directions" link

2. **Event is in `after_rally` status + User HAS opted in**
   - Show checkmark: "You're in for After R@lly! ✓"
   - Show location card
   - Show "Get Directions" link

3. **Event is NOT in `after_rally` status**
   - Don't show the card at all

---

## Files to Create

### 1. `src/components/events/AfterRallyCard.tsx` (NEW)

A new component with:
- Purple gradient styling (matching After R@lly theme)
- Location display with the `after_rally_location_name` from the event
- "Join After R@lly" button (opens opt-in flow)
- "You're In!" status badge when opted in
- "Get Directions" button linking to Google Maps
- Moon icon and consistent styling with the existing After R@lly banner

---

## Files to Modify

### 2. `src/pages/EventDetail.tsx`

- Import the new `AfterRallyCard` component
- Add it in the section immediately after the `RallyHomeButton` section (around line 560)
- Pass required props: `eventId`, `event`, `isOptedIn`, `onJoin`

---

## Component Props

```typescript
interface AfterRallyCardProps {
  eventId: string;
  eventStatus: string;
  afterRallyLocation?: string;
  isOptedIn: boolean;
  onJoinClick: () => void;
  isLoading?: boolean;
}
```

---

## Integration with Existing Code

The card will:
- Reuse `useOptIntoAfterRally` hook for opt-in logic
- Reuse `useAfterRallyTransition` for the theme transition when opting in
- Query user's opt-in status from `myAttendee?.after_rally_opted_in`
- Get location from `(event as any)?.after_rally_location_name`

---

## Visual Design

The card will use:
- Purple gradient background (`gradient-after-rally` class)
- White/light text for contrast
- Moon icon from `lucide-react`
- MapPin icon for location
- Rounded corners and shadow (`rounded-xl shadow-lg`)
- Consistent spacing with other cards in the section

---

## Placement in EventDetail

```
[After R@lly Banner]           ← existing (lines 514-536)
[R@lly Home Button Card]       ← existing (lines 538-560)
[After R@lly Card]             ← NEW (add here)
[SafetyTracker]                ← existing (line 565)
```

---

## Technical Implementation

1. Create the new `AfterRallyCard.tsx` component with the states described above
2. Import it in `EventDetail.tsx`
3. Add conditional rendering:
   - Only show when `isAfterRally === true`
   - Pass `isOptedIn` from `myAttendee?.after_rally_opted_in`
   - Handle "Join" click by setting `showAfterRallyOptIn(true)` to reuse existing dialog

---

## Edge Cases

- Card only appears when event status is `after_rally`
- If user is already opted in, show "You're In!" status instead of join button
- If no location was set by host, show generic "After party continues!" message
- Clicking "Get Directions" opens Google Maps in new tab with the location
