
# Plan: Move Safety Choice Flow from Event Start to Join/Enter Time

## Overview

Currently, the "How are you getting home?" safety flow is triggered when a user is on a **LIVE** event (lines 150-163 in `EventDetail.tsx`). This needs to move to the **join/enter** action instead, ensuring users confirm their transportation plan **before** they can participate in a Rally.

The `JoinRally.tsx` page already has the correct blocking safety modals (`SafetyChoiceModal` and `RidesSelectionModal`) implemented - we need to replicate this gating logic in `EventDetail.tsx` for the "Join Event" button and ensure consistency across all entry points.

---

## What Already Works

The `JoinRally.tsx` page (lines 310-327) already gates entry correctly:
- When user is already attending (`alreadyJoined`), clicking "Enter Rally" checks `hasMadeSafetyChoice`
- If no safety choice, shows `SafetyChoiceModal` (blocking)
- If "R@lly got me" selected, shows `RidesSelectionModal` (blocking)
- User cannot proceed until a choice is completed and persisted

---

## Changes Required

### 1. EventDetail.tsx - Gate the "Join Event" Handler

**Current behavior (lines 231-239):**
The `handleJoin` function directly calls `joinEvent.mutateAsync()` and shows a success toast, allowing immediate entry.

**New behavior:**
After successful join, show the blocking safety modals before allowing the user to see the event content.

**Implementation:**
- Add state variables for safety modal control
- Modify `handleJoin` to trigger `SafetyChoiceModal` after successful join
- Import and add `SafetyChoiceModal` and `RidesSelectionModal` components
- Gate the main event content until safety choice is confirmed

### 2. EventDetail.tsx - Remove Time-Based Trigger

**Current behavior (lines 150-163):**
An `useEffect` watches for `isLive` events and shows `RallyHomeOptInDialog` automatically when the event goes live.

**New behavior:**
- Remove or condition this useEffect so it only serves as a **reminder** for users who somehow bypassed the join flow
- The primary safety gate is now at join time, not event-start time

### 3. EventDetail.tsx - Gate Content for New Attendees

For users who just joined (via the join button on EventDetail), we need to ensure they complete the safety flow before seeing full event content.

**Implementation approach:**
- Track if user just joined and hasn't completed safety choice
- Show the blocking modals instead of / before the main event content
- Once safety choice is made, allow full access

### 4. "Change Plan" Button (Optional Enhancement)

Add a way for users to modify their safety choice from within the Rally Detail page.

---

## Technical Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/EventDetail.tsx` | Add safety modal gating to join handler, import modals, remove/modify time-based trigger |
| `src/hooks/useRallyHomePrompt.tsx` | No changes needed - already provides `canPrompt` logic |
| `src/components/events/SafetyChoiceModal.tsx` | No changes needed |
| `src/components/events/RidesSelectionModal.tsx` | No changes needed |

### Data Persistence (Already Working)

The safety choices are persisted to `event_attendees` table:

| Choice | Field Updated |
|--------|---------------|
| "I'm good" (self-transport) | `not_participating_rally_home_confirmed = true` |
| "Request Ride" | `not_participating_rally_home_confirmed = false` + notification sent |
| "Become DD" | `is_dd = true` |

### "Already Has Plan" Check

The existing logic in `useRallyHomePrompt.tsx` (lines 93-95) already handles this:
```typescript
const isUndecided = 
  attendee.going_home_at === null && 
  attendee.not_participating_rally_home_confirmed === null;
```

A user "has a plan" when:
- `not_participating_rally_home_confirmed = true` (self-transport), OR
- `not_participating_rally_home_confirmed = false` (requested ride), OR
- `is_dd = true` (became a DD)

### Event-Start Reminder Logic

Modify the existing `useEffect` at lines 150-163 to only trigger if:
1. Event is live AND
2. User is attending AND
3. User still hasn't made a safety choice (`myPromptStatus.canPrompt`)

This serves as a fallback reminder, not the primary gate.

---

## Code Changes Summary

### EventDetail.tsx Changes

1. **Add imports:**
```typescript
import { SafetyChoiceModal } from '@/components/events/SafetyChoiceModal';
import { RidesSelectionModal } from '@/components/events/RidesSelectionModal';
```

2. **Add state variables:**
```typescript
const [showSafetyChoice, setShowSafetyChoice] = useState(false);
const [showRidesSelection, setShowRidesSelection] = useState(false);
const [savingSafetyChoice, setSavingSafetyChoice] = useState(false);
```

3. **Modify handleJoin function:**
```typescript
const handleJoin = async () => {
  if (!profile) return;
  try {
    const result = await joinEvent.mutateAsync({ eventId: event.id, profileId: profile.id });
    
    // If successfully joined/pending, show safety modal
    if (result?.status === 'attending') {
      toast.success("You're in! 🎉");
      // Show safety choice modal for new attendees
      setShowSafetyChoice(true);
    } else if (result?.status === 'pending') {
      toast.success('Request sent! Waiting for host approval...');
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to join event');
  }
};
```

4. **Modify the Join/Leave button section (lines 432-456):**
When user clicks "Join Event" and is approved, trigger safety modal flow.

5. **Add the modal components at the end of the component:**
```typescript
{/* Entry Safety Choice Modal */}
<SafetyChoiceModal
  open={showSafetyChoice}
  onOpenChange={setShowSafetyChoice}
  isLoading={savingSafetyChoice}
  onRallyGotMe={() => {
    setShowSafetyChoice(false);
    setShowRidesSelection(true);
  }}
  onDoingItMyself={async () => {
    // Persist choice and close
    await supabase.from('event_attendees')
      .update({ not_participating_rally_home_confirmed: true })
      .eq('event_id', event.id)
      .eq('profile_id', profile.id);
    setShowSafetyChoice(false);
  }}
/>

<RidesSelectionModal
  open={showRidesSelection}
  onOpenChange={setShowRidesSelection}
  onBack={() => {
    setShowRidesSelection(false);
    setShowSafetyChoice(true);
  }}
  onComplete={() => setShowRidesSelection(false)}
  eventId={event.id}
  eventTitle={event.title}
  eventLocationName={event.location_name || undefined}
/>
```

6. **Modify the time-based useEffect (lines 150-163):**
Add a comment clarifying this is now a fallback reminder, not the primary gate.

---

## Flow Diagram

```text
User Action                          System Response
-----------                          ---------------
Tap "Join Rally" / "Enter Rally"  →  Check if already has safety choice
                                      ↓
                            ┌─────────┴─────────┐
                            │                   │
                        Has Choice          No Choice
                            ↓                   ↓
                      Enter Rally       Show SafetyChoiceModal
                                               ↓
                                    ┌──────────┴──────────┐
                                    │                     │
                              "R@lly got me"        "I'm good"
                                    ↓                     ↓
                            RidesSelectionModal      Save choice
                                    ↓                     ↓
                           ┌────────┴────────┐      Enter Rally
                           │                 │
                     Request Ride      Become DD
                           ↓                 ↓
                     Save + Notify     Save DD status
                           ↓                 ↓
                        Enter Rally      Enter Rally
```

---

## Acceptance Criteria Verification

| Requirement | Solution |
|-------------|----------|
| Trigger on Join/Enter/RSVP | Modified `handleJoin` in EventDetail + existing JoinRally flow |
| Show Safety Choice first | `SafetyChoiceModal` shown before entry is allowed |
| "R@lly got me" opens Rides modal | `setShowRidesSelection(true)` on selection |
| Rides modal is blocking | `onPointerDownOutside` and `onEscapeKeyDown` prevented in modals |
| Persist choice to DB | Updates to `event_attendees` table fields |
| Don't re-prompt if already decided | `hasMadeSafetyChoice` / `useRallyHomePrompt.canPrompt` check |
| Event-start reminder (optional) | Keep existing useEffect but now serves as fallback |
| Copy: "HOW YOU GETTIN' HOME?" | Already in SafetyChoiceModal component |
| No faces imagery, use icons | SafetyChoiceModal uses Shield, Car, MapPin icons |
| Loading/error states | `isLoading` prop passed to modals |
| Minimal file changes | Only EventDetail.tsx needs modification |
