

# Fix Squad Visibility for Newly Joined/Invited Users (Updated)

## Summary
Implement the approved squad visibility plan with explicit handling of the `squad_id` returned by `join_squad_by_invite_code`, plus an onboarding safeguard to ensure new users are not teleported past their first-time tutorial.

---

## 1. `src/pages/JoinSquad.tsx` — Store invite code before auth redirect
When an unauthenticated user clicks "Sign In to Join", persist the code:
```ts
localStorage.setItem('rally-pending-squad-code', code);
navigate('/auth');
```

## 2. `src/pages/Auth.tsx` — Auto-join squad after auth, navigate to squad_id
Add a squad join check alongside the existing rally auto-join logic in the `useEffect`:

- Read `rally-pending-squad-code` from localStorage
- If present, call `join_squad_by_invite_code` RPC and await the result
- Extract `squad_id` from the JSONB response (works for both `success` and `already a member` cases)
- Clear the localStorage key
- **Before redirecting**: check onboarding/tutorial status (see Step 6)
- If onboarding is complete, navigate to `/squads/${result.squad_id}`
- If "already a member" with a `squad_id`, navigate there directly
- Fallback to `/squads` if no squad_id returned

## 3. Database Migration — Return `squad_id` on "Already a member"
Update `join_squad_by_invite_code` to include `squad_id` in the "Already a member" response:

**Before:**
```sql
RETURN jsonb_build_object('error', 'Already a member');
```

**After:**
```sql
RETURN jsonb_build_object('error', 'Already a member', 'squad_id', v_squad_id);
```

## 4. `src/hooks/useSquads.tsx` — Process pending invite for already-authenticated users
Add a `useEffect` in `useAllMySquads` that checks for `rally-pending-squad-code` on mount. If found and user is authenticated:
- Call `join_squad_by_invite_code` RPC
- Clear localStorage
- Invalidate squad queries to trigger immediate refetch

## 5. `src/pages/JoinSquad.tsx` — Prioritize RPC `squad_id` for navigation
Update `handleJoinSquad` to use the `squad_id` from the RPC response for navigation rather than falling back to the invite preview data.

## 6. Safeguard: Onboarding/Tutorial Check

To ensure the automatic squad redirect does not bypass or break the initial onboarding tutorial for new users:

In `src/pages/Auth.tsx`, before performing the redirect to a specific squad page, check the user's onboarding/tutorial completion status.

**Logic:**
- If onboarding is **not complete** (i.e., `rally-onboarding-complete` is not `'true'` in localStorage, or `rally-tutorial-complete` is not `'true'`):
  - Still perform the squad join RPC in the background (so the data is ready)
  - Store the target squad ID in localStorage (e.g., `rally-pending-squad-redirect`)
  - Let the user proceed through the normal onboarding/tutorial flow
  - After the tutorial completes (in `useTutorial.tsx` → `endTutorial`), check for `rally-pending-squad-redirect` and navigate the user to `/squads/${squadId}` at that point
- If onboarding **is complete**, proceed with the immediate redirect to `/squads/${squad_id}` as planned in Step 2

**Why this matters:**
- New users need to understand the app before being dropped into a specific squad
- Prevents the app from skipping important intro steps (avatar setup, app walkthrough) just because they clicked an invite link
- The squad join still happens immediately at the database level, so the data is ready when they finish onboarding

## Files Created
- Database migration: update `join_squad_by_invite_code` to return `squad_id` on "Already a member"

## Files Modified
- `src/pages/JoinSquad.tsx` — persist invite code to localStorage, use RPC `squad_id`
- `src/pages/Auth.tsx` — auto-join squad after auth using stored code, navigate to `/squads/{squad_id}` (with onboarding gate)
- `src/hooks/useSquads.tsx` — process pending invite for already-authenticated users
- `src/hooks/useTutorial.tsx` — check for pending squad redirect on tutorial completion

