

# Comprehensive Layout Audit & User Flow Fixes

## Summary
Four friction points and layout issues identified across the three user journeys. Fixes are surgical — no changes to existing safety, rogue, or security logic.

---

## Findings & Fixes

### Fix 1: Invitee Auto-Join Missing `p_has_invite_code` (Critical)

**Problem**: In `src/pages/Auth.tsx` (line 211), when a new user signs up via an invite link and the auto-join fires, the RPC call is:
```typescript
supabase.rpc('request_join_event', { p_event_id: eventData.id })
```
It does NOT pass `p_has_invite_code: true`. This means users who sign up through an invite link still get `pending` status and need host approval — completely defeating the frictionless joining we deployed.

**Fix**: Add `p_has_invite_code: true` to the RPC call. Also update the success handling to navigate to the event page with a "You're in!" toast (matching `JoinRally.tsx` behavior) instead of always showing "Request sent."

**File**: `src/pages/Auth.tsx` — line ~211-237

### Fix 2: Recap Screen Trapped Inside Event Header Card (Layout)

**Problem**: `RallyRecapScreen` is rendered at line 668 inside the `<div className="rounded-2xl bg-card/50 border border-border/50 p-4 ...">` that opens at line 425. This wraps the full cinematic recap (Rogue Timeline, Photo Bundle, Awards, Safe & Sound badge) inside a bordered card with 16px padding — squeezing the layout and breaking the premium editorial feel.

**Fix**: Move the `RallyRecapScreen` render block outside the event header card `</div>` (after line 771). This gives it full container width and proper spacing, matching the cinematic intent.

**File**: `src/pages/EventDetail.tsx` — move lines 668-677 to after line 771

### Fix 3: Pending Rally Code Lost on Browser Close (Resilience)

**Problem**: In `JoinRally.tsx` (line 127), the pending rally code is stored in `sessionStorage`. If a new user clicks an invite link, gets redirected to `/auth` to sign up, then closes the browser before completing signup (e.g., to check email verification), the `pendingRallyCode` is lost. On return, they land on `/` with no redirect to the rally.

**Fix**: Use `localStorage` instead of `sessionStorage` for `pendingRallyCode`, with cleanup after consumption (already done for squad codes). This matches the `rally-pending-squad-code` pattern that already uses `localStorage`.

**Files**: 
- `src/pages/JoinRally.tsx` — line 127: change `sessionStorage.setItem` to `localStorage.setItem`
- `src/pages/Auth.tsx` — line 174: change `sessionStorage.getItem` to `localStorage.getItem`; line 181: change `sessionStorage.removeItem` to `localStorage.removeItem`

### Fix 4: Stale State Query Key Mismatch After Going Rogue

**Problem**: In `EventDetail.tsx` line 752, after going rogue the invalidation uses:
```typescript
queryClient.invalidateQueries({ queryKey: ['my-attendee-status', id] })
```
The actual hook `useMyAttendeeStatus` likely uses `['my-attendee-status', eventId, profileId]` as the key. The partial key match should work due to React Query's prefix matching, but let me verify this is correct — if the hook key includes `profileId`, the partial `[key, id]` will still match. This is actually fine since React Query does prefix matching. No change needed.

---

## What Is NOT Touched

| Feature | Status |
|---|---|
| Going Rogue logic & once-per-event constraint | Unchanged |
| DD arrival cascade trigger | Unchanged |
| Security hardening (safe_profiles, RLS) | Unchanged |
| R@lly Home button visibility rules | Unchanged — correctly shows during live/after_rally |
| Phase-specific Edit Plan / Rogue buttons | Unchanged — verified correct |
| Hype quotes & rider flow | Unchanged |
| Photo bundle split (featured vs gallery) | Unchanged |

## Files Modified
- **Edit**: `src/pages/Auth.tsx` — pass `p_has_invite_code: true`, update success handling for auto-join
- **Edit**: `src/pages/EventDetail.tsx` — move RallyRecapScreen outside the event header card
- **Edit**: `src/pages/JoinRally.tsx` — switch `pendingRallyCode` from sessionStorage to localStorage

## No Database Migration Required

