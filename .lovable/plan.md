

# R@lly UI Simplification and Emotional Polish

Frontend-only refinement across 6 files. Zero logic, hook, query, RPC, or effect changes. All existing boolean conditions preserved byte-for-byte.

---

## Stage 1: Primary Action Bar (EventDetail)

**File:** `src/pages/EventDetail.tsx`

Create a local presentational component `PrimaryActionBar` inside the file. Render it once after line 451 (after PendingJoinRequests), replacing the old Join button (lines 454-466) and Host Rally Controls card (lines 470-524).

**Handler extraction safeguard:** The inline `startRally` handler (lines 497-505) will be extracted as a named const inside the component body:

```typescript
const handleStartRally = async () => {
  try {
    await startRally.mutateAsync(event.id);
    toast.success('R@lly is live! 🎉');
    sessionStorage.removeItem(`rally_home_prompt_${event.id}`);
  } catch (error: any) {
    toast.error(error.message || 'Failed to start rally');
  }
};
```

This is a variable assignment only -- identical mutation call, toast, error handling, and sessionStorage clearing. No new async wrapper logic. No execution order change.

**States** (consuming existing booleans verbatim):

| Condition | Label | Subtext | Handler |
|-----------|-------|---------|---------|
| `!isCreator && !isAttending` | JOIN R@LLY | "Jump in -- your crew is waiting." | `handleJoin` (direct ref) |
| `canManage && isScheduled && isLiveEvent` | START R@LLY | "Go live and rally up." | `handleStartRally` (direct ref) |
| `canManage && isLive` | END R@LLY | "Transition to After R@lly mode." | `() => setShowEndRallyDialog(true)` (verbatim) |
| `canManage && isAfterRally` | COMPLETE MISSION | "Everyone made it. Close it out." | Existing `completeRally` inline from HostSafetyDashboard (verbatim) |

Full-width button, bold label, muted subtext. Only one state renders at a time.

**Removed JSX:** Lines 454-466 (old Join button) and lines 470-524 (Host Rally Controls card). Their handlers remain intact -- only the wrapping JSX changes.

---

## Stage 2: RidePlanCard Simplification

**File:** `src/components/home/RidePlanCard.tsx`

- Update `getPlanLabel` return values:
  - `'dd'` -> `"You're Driving"`
  - `'rider'` -> `"You're Riding"`
  - `'self'` -> `"You're Solo"`
  - `'unset'` -> `"No plan set"` (unchanged)
- Wrap secondary metadata (lines 119-151: loading spinner, assigned driver, pickup/dropoff, DD thanks message) inside a Radix `Collapsible`, collapsed by default, with a small chevron toggle on the plan label row.
- **State protection:** The `Collapsible` uses its own internal open state. No new `useState` introduced. No existing `useEffect` or Supabase query touched. No layout shift on mount -- collapsed content has zero height by default.

---

## Stage 3: Social Momentum Indicators

**File:** `src/pages/EventDetail.tsx`

Add a compact `div` directly below the `h1` (line 338):

```text
8 confirmed . 2 DDs . 3 need rides
```

Using existing loaded data with defensive guards:
- `attendeeCount` (already computed at line 148)
- `eventDDs?.length ?? 0`
- `event?.attendees?.filter(a => a.needs_ride)?.length ?? 0`

**Rendering guard:** Only render when `attendeeCount > 0`. No new queries. No new state. No memoization. All optional chaining for safety.

---

## Stage 4: Header Context Line

**File:** `src/pages/EventDetail.tsx`

Below the social momentum row, add a single subtitle:

```text
Friday . 8:00 PM . Downtown Bar
```

Uses the `format` function already imported from `date-fns` (line 6) and `event.start_time` as already consumed at line 360. Location falls back gracefully if null. No new date libraries. No timezone handling changes.

Reduce existing metadata section spacing from `space-y-2` to `space-y-1` (line 357).

---

## Stage 5: Microcopy Calibration

| File | Line(s) | Current | New |
|------|---------|---------|-----|
| `RidePlanCard.tsx` | 26 | "You're a Designated Driver" | "You're Driving" |
| `RidePlanCard.tsx` | 27 | "Riding with a DD" | "You're Riding" |
| `RidePlanCard.tsx` | 28 | "Getting home on my own" | "You're Solo" |
| `SafetyChoiceModal.tsx` | 40 | "How are you getting home tonight?" | "How are you getting home?" |
| `SafetyChoiceModal.tsx` | 43 | "Plan ahead so you can focus on having fun." | "Pick a plan so you can enjoy the night." |
| `RidesSelectionModal.tsx` | 219 | "Choose how R@lly is getting you home safe" | "How should we get you home?" |
| `EventDetail.tsx` | 613 | "R@lly Home is not active yet" | "R@lly Home activates when the night wraps up." |
| `EventDetail.tsx` | 889 | "Leave Event" | "Leave R@lly" |

---

## Stage 6: Chat Context Banners

**File:** `src/components/chat/EventChat.tsx`

- Add optional `eventStatus?: string` prop to `EventChatProps` interface.
- Render a small colored banner inline before `ScrollArea` (not sticky, no scroll displacement):
  - `eventStatus === 'live'` -> `bg-orange-500 text-white`: "R@lly is live. Move out."
  - `eventStatus === 'after_rally'` -> `bg-purple-600 text-white`: "After R@lly mode active."
- Static visual based on prop value. No conditional mount/unmount during rapid changes. No new hooks.

**File:** `src/pages/EventDetail.tsx` (line 754) -- pass `eventStatus={event.status}` to `EventChat`.

---

## Stage 7: Bar Hop Read-Only Panel

**File:** `src/components/events/BarHopControls.tsx`

Restructure the non-host return block (lines 235-281) into a flatter layout:

```text
Stop 2 of 5
The Copper Tap
[ Navigate ]  [ Mark Arrived ]
```

Replace `Card > CardHeader > CardContent` with a simpler bordered `div`. Same data, same conditional branches, same handlers. Visual simplification only.

---

## Files Modified

1. `src/pages/EventDetail.tsx` -- Stages 1, 3, 4, 5, 6
2. `src/components/home/RidePlanCard.tsx` -- Stages 2, 5
3. `src/components/chat/EventChat.tsx` -- Stage 6
4. `src/components/events/BarHopControls.tsx` -- Stage 7
5. `src/components/events/SafetyChoiceModal.tsx` -- Stage 5
6. `src/components/events/RidesSelectionModal.tsx` -- Stage 5

## Regression Checklist

- PrimaryActionBar uses original handler refs (no duplication): PASS
- No new `useState` introduced: PASS
- No new `useEffect` introduced: PASS
- No dependency arrays changed: PASS
- No mutation logic duplicated or re-wrapped: PASS
- No RPC references changed: PASS
- No JSX lifecycle order changed: PASS
- No scroll displacement introduced: PASS
- No new queries introduced: PASS
- `startRally` extraction is variable assignment only: PASS

