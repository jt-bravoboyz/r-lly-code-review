

# Phase 5: Growth & Competitive Positioning — Implementation Plan

Phase 5 has **not yet been implemented**. All six files are in pre-Phase 5 state. This plan implements the full approved scope with all stability safeguards applied.

---

## Files to Modify (5) + Create (1)

### 1. `index.html` — OG Metadata
- `og:title` → "R@lly — The app for nights that matter"
- `og:description` → "Rally your squad. Track your crew. Get everyone home safe. 🎯"
- `twitter:card` → "summary"
- Add `twitter:title` + `twitter:description` matching OG tags

### 2. `src/components/Onboarding.tsx` — Copy Alignment
- Slide 1: title → "Nights That Matter", desc → "Plan it. R@lly up. Everyone gets home."
- Slide 2: desc → "Live tracking. Group chat. No one left behind."
- Slide 3: desc → "Bar hops, pre-games, big nights — all coordinated."

### 3. `src/components/events/InviteToEventDialog.tsx` — Share Text (line 80)
- Change `"Join my R@lly! Use code: ${inviteCode}"` → `` `You're invited to ${eventTitle} 🎉 — Tap to join the crew` ``
- Existing try/catch + navigator.share detection already safe — no structural changes

### 4. `src/components/events/RallyCompleteOverlay.tsx` — Major Update

**New optional props:** `eventId?`, `eventTitle?`, `inviteCode?`

**Timer safety (Adjustment 1):**
- `timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` — browser-safe, no NodeJS types
- `doneCalledRef = useRef(false)` — checked before every `onDone()` call, set `true` before invoking
- Reset both refs when `show` becomes `false` (inside existing effect)
- Timer callback and all CTA handlers share same guard pattern

**Copy:** Subhead → "Everyone made it. That's the mission."

**Social proof:** When `attendeeCount >= 3`, render "This crew rallies." below mission summary

**Growth CTAs** (below mission summary, only when `attendeeCount > 0`):
- **"Share the Recap"** — only renders if `eventTitle` exists; uses safe share pattern:
  ```typescript
  if (navigator.share) {
    try { await navigator.share({...}) } catch {}
  } else {
    await navigator.clipboard.writeText(...)
    toast.success(...)
  }
  ```
- **"Invite This Crew Again"** — only renders if `inviteCode` exists; opens `InviteToEventDialog`
- **"Make This a Squad"** — navigates to `/squads` with toast

Each CTA: clears `timerRef`, checks `doneCalledRef`, calls `onDone()` once after action.

### 5. `src/components/events/RallyRecapCard.tsx` — New File

Pure presentational component. Props: `eventTitle`, `eventType`, `attendeeCount`, `ddCount`.

- Uses `getEventTypeEmoji` + `getEventTypeVibe` from `eventTypes.ts`
- Static object map for vibe → gradient classes (no dynamic Tailwind interpolation):
  ```typescript
  const VIBE_GRADIENTS: Record<string, string> = {
    orange: 'from-orange-500/20 to-orange-600/10',
    purple: 'from-purple-500/20 to-purple-600/10',
    // ... etc
  };
  ```
- Renders: emoji + title, attendee/DD counts with icons, "Everyone made it home safe ✅", R@lly branding footer
- No hooks, no queries, no state — pure props-in, JSX-out

### 6. `src/pages/EventDetail.tsx` — Two Changes

**Line 1061-1066:** Pass new props to `<RallyCompleteOverlay>`:
```
eventId={event.id}
eventTitle={event.title}
inviteCode={event.invite_code}
```

**Lines 410-414:** Social proof threshold `>= 5` → `>= 3`, copy:
- If `isCreator`: "Your crew is locked in."
- Else: "The crew's growing."

---

## Stability Safeguards Confirmed

1. **Timer:** `ReturnType<typeof setTimeout>` (no NodeJS types), `doneCalledRef` prevents double-fire, cleanup idempotent, refs reset in effect
2. **CTA guarding:** Each CTA conditionally renders based on prop existence — no assumptions
3. **Share safety:** All `navigator.share()` calls feature-detected, try/catch wrapped, clipboard fallback with toast
4. **Styling:** Static object map for vibe classes, no dynamic Tailwind interpolation

## Guardrails
No new database tables, analytics events, hooks, global state, queries, routing changes, mutation changes, or lifecycle restructuring.

