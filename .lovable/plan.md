
# Revised Plan: Fix R@lly Home Participation vs. En Route Status

## Analysis Summary

After reviewing all dependent components, I've identified the following compatibility considerations:

### Database Schema ✅ Confirmed
All required columns exist in `event_attendees`:
- `destination_name` (string | null)
- `destination_lat` (number | null)
- `destination_lng` (number | null)  
- `after_rally_opted_in` (boolean | null)
- `going_home_at` (string | null)

### Components Using SafetyState Type
| Component | Impact | Needs Update |
|-----------|--------|--------------|
| `SafetyTracker.tsx` | Uses `getSafetyState()` in switch statements | Yes - add `opted_in` case |
| `HostSafetyDashboard.tsx` | Uses `getSafetyState()` for grouping | Yes - add `opted_in` case |
| `SafetyCloseoutDialog.tsx` | Uses `getSafetyState()` for counting | Minimal - works with new state |
| `DDDropoffButton.tsx` | Filters for `participating` state only | No change needed |
| `useAutoArrival.tsx` | Checks `going_home_at` directly | No change needed |
| `useRallyHomePrompt.tsx` | Checks `going_home_at` directly | No change needed |
| `useIsEventSafetyComplete.tsx` | Checks `going_home_at` directly | Needs review |

---

## Potential Issues Identified & Solutions

### Issue 1: TypeScript Exhaustiveness Checking
Adding `opted_in` to the `SafetyState` type will cause TypeScript errors in any `switch` statement that doesn't handle it.

**Files requiring explicit handling:**
- `SafetyTracker.tsx` - `SafetyStateIcon`, `SafetyStateBadge`, `getStateBackgroundColor`, `getIconBackgroundColor`
- `HostSafetyDashboard.tsx` - `SafetyStateBadge`

**Solution:** Add explicit cases for `opted_in` in all switch statements before building.

### Issue 2: Safety Completion Logic
The `useIsEventSafetyComplete` function currently considers users as "undecided" if they have no `going_home_at` AND `not_participating_rally_home_confirmed === null`. 

With the new `opted_in` state (destination set but `going_home_at` null), users would incorrectly appear as "undecided" in safety completion checks.

**Solution:** Update the safety completion logic to recognize opted-in users as having made a valid choice:
```typescript
// Current logic (problematic):
if (!a.going_home_at && a.not_participating_rally_home_confirmed === null) {
  return true; // incomplete
}

// Fixed logic:
if (!a.going_home_at && a.not_participating_rally_home_confirmed === null && 
    !a.after_rally_opted_in) {  // Only undecided if not opted in
  return true; // incomplete
}
```

### Issue 3: RallyHomeButton State Flow
The current button shows "I've Arrived Safely" immediately after setting destination. This needs to show "Destination Set ✓" instead until the event ends.

**Solution:** Add `eventStatus` prop and conditional rendering based on event phase.

### Issue 4: AttendeeWithSafetyStatus Interface
The interface needs to include `destination_name` to properly check for opted-in status.

**Solution:** Add `destination_name` to the interface and fetch it in queries.

---

## Detailed Implementation

### 1. Update SafetyState Type (useSafetyStatus.tsx)

```typescript
// Add new state
export type SafetyState = 
  | 'participating' 
  | 'arrived_safely' 
  | 'not_participating' 
  | 'undecided'
  | 'opted_in'     // NEW: destination set but not yet departing
  | 'dd_pending';

// Update getSafetyState logic
export function getSafetyState(attendee: AttendeeWithSafetyStatus): SafetyState {
  if (attendee.arrived_safely || attendee.dd_dropoff_confirmed_at) {
    return 'arrived_safely';
  }
  
  if (attendee.is_dd && !attendee.arrived_safely) {
    if (attendee.going_home_at) {
      return 'participating';
    }
    return 'dd_pending';
  }
  
  // En route (actively traveling home)
  if (attendee.going_home_at) {
    return 'participating';
  }
  
  // NEW: Opted in but not yet departing (destination set)
  if (attendee.after_rally_opted_in && attendee.destination_name) {
    return 'opted_in';
  }
  
  if (attendee.not_participating_rally_home_confirmed === true) {
    return 'not_participating';
  }
  
  return 'undecided';
}

// Update label function
export function getSafetyStateLabel(state: SafetyState): string {
  switch (state) {
    case 'participating':
      return 'En Route Home';
    case 'arrived_safely':
      return 'Arrived Safely';
    case 'not_participating':
      return 'Not Participating';
    case 'undecided':
      return 'Undecided';
    case 'opted_in':          // NEW
      return 'Ready for R@lly Home';
    case 'dd_pending':
      return 'DD - Awaiting Arrival';
  }
}
```

### 2. Update Interface (useSafetyStatus.tsx)

Add `destination_name` to `AttendeeWithSafetyStatus` and update queries:

```typescript
export interface AttendeeWithSafetyStatus {
  // ... existing fields
  destination_name?: string | null;  // NEW
}
```

### 3. Update SafetyTracker.tsx

Add cases for `opted_in` state in all switch functions:

```typescript
// SafetyStateIcon
case 'opted_in':
  return <Shield className="h-3 w-3 text-white" />;

// SafetyStateBadge  
case 'opted_in':
  return (
    <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
      <Shield className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );

// getStateBackgroundColor
case 'opted_in':
  return 'bg-blue-50 border-blue-200';

// getIconBackgroundColor
case 'opted_in':
  return 'bg-blue-500';
```

Also update summary badges section to show opted-in count.

### 4. Update HostSafetyDashboard.tsx

Add `opted_in` case to `SafetyStateBadge` and update grouping:

```typescript
case 'opted_in':
  return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px]">
      <Shield className="h-2.5 w-2.5 mr-1" />
      {label}
    </Badge>
  );

// Add to grouping
const optedIn = attendees.filter(a => getSafetyState(a) === 'opted_in');
```

### 5. Update useIsEventSafetyComplete (useSafetyStatus.tsx)

Fix the completion logic to recognize opted-in users:

```typescript
const safetyComplete = attendees ? !attendees.some(a => {
  if (a.going_home_at && !a.arrived_safely && !a.dd_dropoff_confirmed_at) {
    return true;
  }
  if (a.is_dd && !a.arrived_safely) {
    return true;
  }
  // Fixed: Only undecided if not opted in AND not confirmed not participating
  if (!a.going_home_at && 
      a.not_participating_rally_home_confirmed !== true && 
      !a.after_rally_opted_in) {  // NEW CHECK
    return true;
  }
  return false;
}) : true;
```

### 6. Update RallyHomeButton.tsx

Add event status awareness:

```typescript
interface RallyHomeButtonProps {
  eventId: string;
  trigger?: React.ReactNode;
  eventStatus?: string;  // NEW
}

// Derive additional state
const hasDestinationSet = !!myStatus?.destination_name;
const isEventOver = eventStatus === 'after_rally' || eventStatus === 'completed';

// Update handleGoHome to conditionally set going_home_at
const handleGoHome = async () => {
  // ... existing validation
  
  const { error } = await supabase
    .from('event_attendees')
    .update({
      // Only set going_home_at if event is over
      going_home_at: isEventOver ? new Date().toISOString() : null,
      destination_name: finalAddress,
      destination_lat: coords?.lat || null,
      destination_lng: coords?.lng || null,
      destination_visibility: visibility,
      destination_shared_with: visibility === 'selected' ? selectedPeople : [],
      arrived_safely: false,
      arrived_at: null,
      after_rally_opted_in: true,
    } as any)
    .eq('event_id', eventId)
    .eq('profile_id', profile.id);
  
  // Different toast based on event phase
  if (isEventOver) {
    toast.success(`You're heading ${destinationType === 'home' ? 'home' : 'to ' + finalAddress}!`);
  } else {
    toast.success('Destination saved! ✓', {
      description: "We'll remind you when it's time to head home",
    });
  }
};

// New UI state for destination set but not departed
if (hasDestinationSet && !isGoingHome && !hasArrived && !notParticipating) {
  if (isEventOver) {
    // Show "Start Heading Home" button
    return (
      <Button onClick={handleStartJourney} className="...">
        <Navigation className="h-5 w-5 mr-2" />
        I'm Heading Home Now
      </Button>
    );
  } else {
    // Show "Destination Set" status
    return (
      <Button disabled className="... bg-blue-500/20 text-blue-700">
        <Shield className="h-5 w-5 mr-2" />
        Destination Set ✓
      </Button>
    );
  }
}
```

### 7. Update EventDetail.tsx

Pass event status to RallyHomeButton:

```typescript
<RallyHomeButton 
  eventId={event.id} 
  eventStatus={event.status}  // NEW
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSafetyStatus.tsx` | Add `opted_in` state, update interface, fix completion logic |
| `src/components/home/SafetyTracker.tsx` | Add `opted_in` cases to all switch statements |
| `src/components/home/HostSafetyDashboard.tsx` | Add `opted_in` case and summary |
| `src/components/home/RallyHomeButton.tsx` | Add event status awareness, new UI states |
| `src/pages/EventDetail.tsx` | Pass eventStatus prop to RallyHomeButton |

---

## Testing Checklist

After implementation, verify:
1. Setting destination before event ends shows "Destination Set ✓" 
2. SafetyTracker shows user as "Ready for R@lly Home" (not "En Route")
3. Safety completion logic accepts opted-in users as valid
4. After event ends, opted-in users see "I'm Heading Home Now" button
5. Clicking "I'm Heading Home Now" sets going_home_at and shows "I've Arrived Safely"
6. Auto-arrival only triggers during after_rally/completed phases (unchanged)
7. DD dropoff button still correctly filters for "participating" state only
8. No TypeScript errors from unhandled switch cases

---

## User Flow Summary

```text
DURING EVENT (scheduled/live):
User → Sets destination → Status: "opted_in" → Button: "Destination Set ✓"
                                             → Tracker: "Ready for R@lly Home"

AFTER EVENT ENDS (after_rally/completed):
Opted-in user → Button: "I'm Heading Home Now"
             → Clicks → Status: "participating" → Button: "I've Arrived Safely"
                                                → Tracker: "En Route Home"
                                                → Auto-arrival activates
```

This approach ensures complete TypeScript compatibility and maintains all existing safety features while properly separating the "opted in" and "en route" states.
