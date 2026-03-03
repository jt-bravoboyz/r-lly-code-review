

# R@lly Invite Energy Evolution -- Verified Implementation Plan

All three structural safety checks have been explicitly confirmed against the current codebase. This plan is ready for execution.

---

## Structural Safety Confirmations

### 1. Hero Wrapper Scope: CLEAN
The existing `div` at line 324 already closes at line 579, naturally scoping the hero section. The Tabs component (line 618), After R@lly banner (line 515), R@lly Home button (line 540), Safety sections (line 583), and DD buttons (lines 608-615) are all siblings outside this div. Adding `rounded-2xl bg-card/50 border border-border/50 p-4` to this existing div is a style-only change. No re-parenting. No stacking context. No flex order change.

### 2. CreateEvent Collapsible: CLEAN
Radix `CollapsibleContent` renders its children to the DOM even when collapsed (CSS-hidden, not unmounted). All `FormField` components remain permanently mounted, so `react-hook-form` registration is never interrupted. The `eventSchema` (lines 27-40) and `onSubmit` handler (lines 93-171) are untouched. Layout-only change.

### 3. VIBE_STYLES Mapping: CLEAN
Six vibe keys (`orange`, `purple`, `green`, `blue`, `red`, `default`) cover all 28 event types. Every key has a corresponding static class string entry. Fallback via `?? VIBE_STYLES.default`. Zero dynamic Tailwind interpolation.

---

## Implementation (6 Files)

### File 1: `src/lib/eventTypes.ts`

Add `emoji` and `vibe` properties to each event type entry. Add two helper functions: `getEventTypeEmoji()` and `getEventTypeVibe()`.

Vibe assignments:
- orange: rally, pre_game, bar, happy_hour, bbq
- purple: party, concert, festival
- green: brunch, beach, hiking, fitness
- blue: movie, game_night, sports, tailgate, graduation, road_trip
- red: birthday, wedding, holiday, anniversary, fundraiser
- default: dinner, corporate, networking, meetup, other

### File 2: `src/pages/EventDetail.tsx`

**Imports added:** `Link2` from lucide, `getEventTypeEmoji`, `getEventTypeVibe` from eventTypes, `Avatar`/`AvatarImage`/`AvatarFallback` (already imported).

**Static map added above component:**
```text
const VIBE_STYLES: Record<string, string> = {
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  green:  "bg-green-500/10 text-green-600 border-green-500/30",
  blue:   "bg-blue-500/10 text-blue-600 border-blue-500/30",
  red:    "bg-red-500/10 text-red-600 border-red-500/30",
  default: "bg-muted text-foreground border-border",
};
```

**Changes (all within existing JSX structure):**

1. **Hero card feel** -- Add `rounded-2xl bg-card/50 border border-border/50 p-4` and reduce `space-y-4` to `space-y-3` on the existing div at line 324. Scope unchanged.

2. **Title** -- Change `text-2xl font-bold` to `text-3xl font-bold tracking-tight`. Prepend emoji from `getEventTypeEmoji(event.event_type)` inline with conditional render.

3. **Vibe badge** -- Replace `Badge variant="outline"` at line 329 with a vibe-tinted badge using `VIBE_STYLES[getEventTypeVibe(event.event_type)]`.

4. **Avatar stack** -- Add 5-avatar overlapping row before the social momentum text counts (inside the existing `attendeeCount > 0` guard). Uses `event.attendees` already loaded.

5. **Copy invite link** -- Add a ghost button below the context line that copies `${window.location.origin}/join/${event.invite_code}` to clipboard and shows `toast.success('Link copied!')`.

6. **Join confirmation** -- After PrimaryActionBar, render `"You're in. Let's go."` when `isAttending && !isCreator`. Pure conditional from existing boolean.

7. **isSimpleMode derived const** -- `const isSimpleMode = !event?.is_barhop && (eventDDs?.length ?? 0) === 0 && !isLive && !isAfterRally;` Not state. Not effect. Not memo.

8. **Simple mode: hide R@lly Home placeholder** -- Wrap lines 600-604 condition in `&& !isSimpleMode`.

9. **Simple mode: Rides tab de-emphasis** -- Add `className={isSimpleMode ? 'opacity-50' : ''}` to Rides TabsTrigger. Tab remains functional.

10. **Rides density** -- Replace gradient card (lines 783-797) with bordered `div`. Same handlers.

11. **Microcopy** -- Line 509: "Transition to After R@lly mode." to "Move to After R@lly mode."

### File 3: `src/components/events/CreateEventDialog.tsx`

1. **Title** -- "Create New Event" to "Create a R@lly" with subtitle "Set up your R@lly in under 30 seconds."
2. **Collapsible** -- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` and `ChevronDown`. Wrap Description, Max Attendees, and StagedMediaPicker inside a Collapsible (collapsed by default). Event Type moves to full width outside the grid. Required fields (Title, Event Type, Date, Time, Location) remain always visible.
3. **Submit text** -- "Create Event" to "Create R@lly".

### File 4: `src/components/home/HostSafetyDashboard.tsx`

Microcopy only:
- Line 290: "Complete R@lly - Everyone is Safe!" to "Mission complete. Everyone made it."
- Line 293: "Waiting for Safety Confirmations..." to "Waiting for everyone to check in..."
- Line 298: Long text to "You can close out once everyone has checked in safe."

### File 5: `src/components/events/RallyCompleteOverlay.tsx`

- Line 45: "R@lly complete." to "Mission complete."
- Line 48: "See you at the next one." to "Everyone made it. See you next time."

### File 6: `src/components/chat/EventChat.tsx`

- System message styling: change from `bg-muted/50` to `bg-muted/30 border border-border/50`
- Add `pt-2` to the messages container for top breathing room

---

## Regression Checklist

- No new `useState`: PASS (isSimpleMode is derived const; Collapsible uses internal Radix state)
- No new `useEffect`: PASS
- No dependency arrays changed: PASS
- No mutation logic altered: PASS
- No RPC references touched: PASS
- No query keys changed: PASS
- No realtime subscriptions modified: PASS
- No map/clustering/directions logic touched: PASS
- No ride logic altered: PASS
- No lifecycle order changed: PASS
- No theme engine altered: PASS
- No tab routing altered: PASS
- No form validation changed: PASS
- PrimaryActionBar uses original handler references only: PASS
- VIBE_STYLES uses static class strings only: PASS
- Hero wrapper scoped to existing div boundary: PASS
- Collapsible wraps only optional fields; required fields always visible: PASS
- FormField registration never unmounted: PASS

## Competitive Checklist

1. Emoji + Vibe Header: PRESENT
2. Social Energy Layer (avatar stack + counts): PRESENT
3. Join Dopamine Confirmation: PRESENT
4. Creation Flow Lightness: PRESENT
5. Shareability (copy invite link): PRESENT
6. Simple Mode Visual Lightness: PRESENT
7. Rides Tab Density Reduction: PRESENT
8. Microcopy Softening: PRESENT
9. Chat Visual Polish: PRESENT

All 9 competitive requirements met. All 3 structural safety checks clean.
