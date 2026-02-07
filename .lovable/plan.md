

# Plan: Redesign Safety Choice Flow - Planning Before Entering Rally

## Overview

Transform the safety choice flow from a passive button to a mandatory, calm planning step that happens **before entering a Rally** (not just at join time or when live). Users must choose their transportation plan before seeing the full event content, but the flow is intentional and planning-focused, not alarming.

---

## Current State vs. Desired State

| Aspect | Current | Proposed |
|--------|---------|----------|
| When prompted | At join time (instant join) or when event goes live | Before entering/viewing the Rally |
| R@lly Home Button | Prominent card visible during live events | Hidden before rally starts; only contextual after |
| "R@lly got me" flow | Opens Rides modal | Immediately opens Rides modal (same) |
| "I'm good" flow | Saves choice, closes modal | Saves choice, closes modal, continues to Rally |
| After Rally starts | Can show reminder if undecided | Contextual reminders only, no big button |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/events/SafetyChoiceModal.tsx` | Update copy to be calmer/planning-focused |
| `src/pages/EventDetail.tsx` | Hide R@lly Home button card before event starts; show safety modal on page load if undecided |
| `src/pages/JoinRally.tsx` | Existing flow already works correctly |

---

## Implementation Details

### 1. Update Safety Modal Copy (`SafetyChoiceModal.tsx`)

Make the tone calm and planning-focused:

```
Current: "HOW YOU GETTIN' HOME?"
         "Before you enter the R@lly, confirm your plan."

Update:  "How are you getting home tonight?"
         "Plan ahead so you can focus on having fun."
```

Button labels remain the same:
- "R@lly got me" (primary gradient button)
- "I'm good" (outline button)

Footer note: "You can change this later in the Rally"

---

### 2. EventDetail.tsx - Entry Gate Logic

**Change 1: Show SafetyChoiceModal on page load if undecided**

Currently, the modal only shows after clicking "Join". We need to also show it when:
- User is already attending (existing attendee returning to page)
- User has NOT made a safety choice yet (`going_home_at === null` AND `not_participating_rally_home_confirmed === null` AND `is_dd === false`)
- Event is NOT completed

Add a query to check existing attendee's safety status and trigger modal on page load:

```typescript
// New query for existing attendees' safety choice status
const { data: myAttendeeStatus } = useQuery({
  queryKey: ['my-attendee-safety', id, profile?.id],
  queryFn: async () => {
    if (!id || !profile?.id) return null;
    const { data } = await supabase
      .from('event_attendees')
      .select('going_home_at, not_participating_rally_home_confirmed, is_dd')
      .eq('event_id', id)
      .eq('profile_id', profile.id)
      .maybeSingle();
    return data;
  },
  enabled: !!id && !!profile?.id,
});

// Determine if user needs to make safety choice
const needsSafetyChoice = isAttending && 
  myAttendeeStatus?.going_home_at === null && 
  myAttendeeStatus?.not_participating_rally_home_confirmed === null &&
  !myAttendeeStatus?.is_dd &&
  event?.status !== 'completed';

// Show modal on mount if needed
useEffect(() => {
  if (needsSafetyChoice && !showSafetyChoice && !showRidesSelection) {
    const shownKey = `safety_choice_entry_${id}`;
    if (!sessionStorage.getItem(shownKey)) {
      sessionStorage.setItem(shownKey, 'true');
      setShowSafetyChoice(true);
    }
  }
}, [needsSafetyChoice, id]);
```

**Change 2: Hide R@lly Home Button Card BEFORE event starts**

Current code (line 540):
```tsx
{(isLiveEvent || isAfterRally) && isAttending && (
  <section className="space-y-4">
    <RallyHomeButton ... />
```

This is already correct - it only shows during live/after_rally. No change needed here.

**Change 3: Remove the "R@lly Home" card from being prominent before start**

The existing logic already handles this since `isLiveEvent` checks if start time has passed. The R@lly Home button card only appears once the event is live.

---

### 3. JoinRally.tsx - No Changes Needed

The existing flow in JoinRally.tsx already:
1. Shows SafetyChoiceModal when user clicks "Enter Rally"
2. On "R@lly got me" → Opens RidesSelectionModal
3. On "I'm good" → Saves choice, navigates to event
4. RidesSelectionModal allows: Request Ride OR Become DD

This matches the desired flow exactly.

---

## Summary of Changes

1. **SafetyChoiceModal.tsx**: Soften copy from "HOW YOU GETTIN' HOME?" to "How are you getting home tonight?" and update description to planning-focused language

2. **EventDetail.tsx**: Add logic to show SafetyChoiceModal on page load for existing attendees who haven't made a choice yet (with sessionStorage to prevent repeat prompts)

---

## What Stays the Same

- R@lly Home Button only appears during live/after_rally events (already implemented)
- The Rides flow (request ride OR become DD) remains unchanged
- Backend schema and stored values remain unchanged
- Join flow in JoinRally.tsx already works correctly

---

## Flow Diagram

```text
User visits /events/{id}
         ↓
    Is attending?
    /           \
  No             Yes
   ↓               ↓
Join button   Has made safety choice?
   ↓              /         \
Shows modal    Yes           No
on join       (continue)   (show modal)
                              ↓
                    "R@lly got me" | "I'm good"
                         ↓              ↓
                   Rides Modal    Save choice
                   (DD or Rider)  Continue
                         ↓
                    Complete
                    Continue to Rally
```

---

## Deliverables

1. `src/components/events/SafetyChoiceModal.tsx` - Updated copy
2. `src/pages/EventDetail.tsx` - Add entry-gate logic for existing attendees

