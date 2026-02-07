
# Plan: Add Location Sharing Prompt After Rally Rides Setup

## Overview

After a user completes Rally Rides setup (either requesting a ride OR becoming a DD), immediately show a second popup prompting them to share their location with the rally group. This is a "no man left behind" safety feature that happens **before** they fully enter the Rally.

---

## Current State

| Component | Behavior |
|-----------|----------|
| `RidesSelectionModal.tsx` | Calls `onComplete()` after ride request succeeds |
| `DDSetupDialog.tsx` | Calls `onComplete()` after DD setup succeeds |
| `event_attendees.share_location` | Boolean already exists in schema |
| Location prompt tracking | No field exists yet |

---

## Proposed Flow

```text
User completes Rally Rides
         ↓
   Location Sharing Modal appears
      "NO MAN LEFT BEHIND"
         ↓
  "Share Location" | "Not Now"
         ↓              ↓
Request OS perm    Save declined
Enable sharing     Continue to Rally
Continue to Rally
```

---

## Files to Modify/Create

| File | Change |
|------|--------|
| **NEW** `src/components/events/LocationSharingModal.tsx` | New modal component |
| `src/components/events/RidesSelectionModal.tsx` | Add state to show location modal after completion |
| `src/pages/JoinRally.tsx` | Wire up location modal in the flow |
| `src/pages/EventDetail.tsx` | Wire up location modal in the flow |
| Database migration | Add `location_prompt_shown` column to `event_attendees` |

---

## Implementation Details

### 1. Database Migration

Add a column to track if the user has seen the location prompt for this rally:

```sql
ALTER TABLE event_attendees 
ADD COLUMN location_prompt_shown boolean DEFAULT false;
```

This prevents re-prompting. Once `location_prompt_shown = true`, skip the modal.

---

### 2. New Component: `LocationSharingModal.tsx`

Create a new modal matching the Rally Rides style:

**Props:**
```typescript
interface LocationSharingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onComplete: () => void; // Called after user makes choice
}
```

**UI:**
- Icon: MapPin with Shield overlay (similar to existing LocationSharingBanner)
- Title: "NO MAN LEFT BEHIND"  
- Body: "Share your live location with the squad so everybody gets home safe."
- Primary button: "Share Location" (gradient style)
- Secondary button: "Not Now" (ghost style)

**Behavior:**
- "Share Location" clicked:
  1. Request browser geolocation permission via `navigator.geolocation.getCurrentPosition()`
  2. If granted: Update `event_attendees.share_location = true` AND `location_prompt_shown = true`
  3. If denied: Show toast "No worries—you can turn it on later in the Rally.", set `location_prompt_shown = true`
  4. Call `onComplete()`
  
- "Not Now" clicked:
  1. Update `event_attendees.location_prompt_shown = true` (skip sharing)
  2. Call `onComplete()`

---

### 3. Modify `RidesSelectionModal.tsx`

Add state and logic to show location modal after rides completion:

```typescript
// New state
const [showLocationModal, setShowLocationModal] = useState(false);
const [pendingComplete, setPendingComplete] = useState(false);

// Modified onComplete logic
const handleRidesComplete = () => {
  // Instead of calling onComplete immediately, show location modal
  setPendingComplete(true);
  onOpenChange(false); // Close rides modal
  setShowLocationModal(true); // Show location modal
};

// After location choice is made
const handleLocationComplete = () => {
  setShowLocationModal(false);
  onComplete(); // Now call the original onComplete
};
```

The component will render:
```tsx
<LocationSharingModal
  open={showLocationModal}
  onOpenChange={setShowLocationModal}
  eventId={eventId}
  onComplete={handleLocationComplete}
/>
```

---

### 4. Modify `JoinRally.tsx`

The same pattern - after rides modal closes, show location modal:

```typescript
// Add state
const [showLocationModal, setShowLocationModal] = useState(false);

// Modify RidesSelectionModal onComplete
onComplete={() => {
  setShowRidesSelection(false);
  setShowLocationModal(true); // Show location modal instead of navigating
}}

// Add LocationSharingModal
<LocationSharingModal
  open={showLocationModal}
  onOpenChange={setShowLocationModal}
  eventId={joinedEventId!}
  onComplete={() => {
    setShowLocationModal(false);
    navigate(`/events/${joinedEventId}`);
  }}
/>
```

---

### 5. Modify `EventDetail.tsx`

Same pattern for users entering from the event detail page:

```typescript
// Add state
const [showLocationModal, setShowLocationModal] = useState(false);

// Modify RidesSelectionModal onComplete (around line 973)
onComplete={() => {
  setShowRidesSelection(false);
  setShowLocationModal(true);
}}

// Add LocationSharingModal
<LocationSharingModal
  open={showLocationModal}
  onOpenChange={setShowLocationModal}
  eventId={event.id}
  onComplete={() => {
    setShowLocationModal(false);
    queryClient.invalidateQueries({ queryKey: ['event', event.id] });
  }}
/>
```

---

### 6. Preventing Repeated Prompts

The modal will check before showing:

```typescript
// In the parent component before triggering the modal
const shouldShowLocationPrompt = async () => {
  const { data } = await supabase
    .from('event_attendees')
    .select('location_prompt_shown, share_location')
    .eq('event_id', eventId)
    .eq('profile_id', profile.id)
    .maybeSingle();
  
  // Skip if already prompted OR already sharing
  return !data?.location_prompt_shown && !data?.share_location;
};
```

---

## Summary of Changes

1. **Database**: Add `location_prompt_shown` boolean to `event_attendees`
2. **New File**: `src/components/events/LocationSharingModal.tsx`
3. **RidesSelectionModal.tsx**: Chain to location modal on complete
4. **JoinRally.tsx**: Add location modal in the flow
5. **EventDetail.tsx**: Add location modal in the flow

---

## What Stays the Same

- Safety choice flow unchanged
- Rally Rides UI unchanged  
- Existing `share_location` field and location tracking logic unchanged
- All other modals and flows unchanged
