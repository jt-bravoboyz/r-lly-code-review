
# Plan: Move Leave Event Button to Bottom of Page

## Overview

Move the "Leave Event" button to the very bottom of the EventDetail page, below all the tab content (Details, Chat, Track, Rides), just above the `BottomNav` component.

---

## Current Location

The "Leave Event" button is currently at lines 442-466, positioned in the header section near the host info.

## Target Location

Move it to line 855 (after the `</Tabs>` closing tag and before `</main>`), so it appears at the absolute bottom of the scrollable content area.

---

## Changes

### File: `src/pages/EventDetail.tsx`

1. **Keep the Join button in its current location** (lines 456-463) for discoverability by new users

2. **Remove the Leave button** from the current conditional block (lines 445-454)

3. **Add the Leave Event button at the bottom** (after line 854, before `</main>`):
   - Only show for attending users who aren't the event creator
   - Style as a destructive/outline variant for clarity
   - Add padding to ensure it's not too close to the BottomNav

---

## Code Changes

### Current section (lines 442-466) becomes:
```tsx
{/* Join Button - Only for non-attendees */}
{!isCreator && !isAttending && (
  <div className="pt-2">
    <Button 
      className="w-full gradient-primary"
      onClick={handleJoin}
      disabled={joinEvent.isPending}
    >
      <Check className="h-4 w-4 mr-2" />
      Join Event
    </Button>
  </div>
)}
```

### New section added before `</main>` (after line 854):
```tsx
{/* Leave Event Button - At bottom for attendees */}
{!isCreator && isAttending && (
  <div className="px-4 pb-24 pt-6">
    <Button 
      variant="outline" 
      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
      onClick={handleLeave}
      disabled={leaveEvent.isPending}
    >
      <X className="h-4 w-4 mr-2" />
      Leave Event
    </Button>
  </div>
)}
```

---

## Result

- **Join Event** button stays at the top for easy discovery
- **Leave Event** button moves to the very bottom, after all tab content
- The bottom padding (`pb-24`) ensures the button doesn't overlap with `BottomNav`
