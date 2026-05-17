# Add a "Join a R@lly with code" entry point

## Problem
The `/join` route + manual code input already exist (`src/pages/JoinRally.tsx`), but nothing in the app's chrome links to it. The only way in today is tapping a shared `rlly.cloud/join/<code>` link from outside the app. Users who were told a code verbally have no way to redeem it.

## Plan

### 1. Primary entry — Home screen header (`src/pages/Index.tsx`)
- Add a clean, premium Apple-style action button in the top header row of the Home page (`src/pages/Index.tsx`).
- Pair a neutral ghost style (`text-foreground/80`) `KeyRound` icon + label "Join with code" next to or balanced with the primary active triggers.
- Tapping it navigates to `/join` (the page already supports the empty-code state with its manual-entry input).
- On mobile viewports < 380px: collapse to icon-only to preserve space; from sm: up, show full label.
- Maintain a crisp 44px touch target.

### 2. Secondary entry — CreateEventDialog footer (`src/components/events/CreateEventDialog.tsx`)
- One-line text link at the bottom of the create sheet: *"Got an invite code? Join a R@lly →"* that closes the sheet and navigates to `/join`.
- Covers the case where a new user taps "+ Create" thinking that's how you participate.

### 3. Optional empty-state fallback (`src/pages/Events.tsx`)
- On the Events page empty state ("No R@llies yet"), add a secondary **"Join with code"** ghost action below the primary "Create your first R@lly" CTA. (De-prioritized; only if Home header feels hidden on that tab.)

## Out of scope
- No changes to `JoinRally.tsx` itself — its UI, RPC calls, and pending-code persistence already work.
- No changes to the bottom nav (5 tabs are already at capacity per the layout system).
- No changes to deep-link handling or `AuthRedirectGuard`.

## Files to touch
- `src/pages/Index.tsx` — header CTA row.
- `src/components/events/CreateEventDialog.tsx` — footer link.

## Visual / token notes
- Use existing `Button variant="ghost"` + `KeyRound` from `lucide-react`.
- Brand orange only on the primary action — the join entry stays neutral (`text-foreground/80`) so it doesn't compete.
- 44px touch target preserved.