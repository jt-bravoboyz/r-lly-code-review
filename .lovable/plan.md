

# Plan: Founding 25 Invite Flow with `?ref=founding25`

## What This Does

When someone visits `https://rallyboyz.lovable.app?ref=founding25`, the app will:
1. Auto-assign them as a Founding Member (badge + number) on signup
2. Show the standard tutorial walkthrough (already profile-age triggered)
3. Display a persistent "Founding Member" testing banner with a link to `rally.canny.io`

## Technical Changes

### 1. Capture `?ref=founding25` Parameter
**File: `src/pages/Auth.tsx`**
- The existing referral capture (line 51-60) already reads `?r=` params. Extend it to also check for `ref=founding25` specifically.
- When detected, store `localStorage.setItem('rally-founding25', 'true')` alongside the referral ID logic.

### 2. Auto-Assign Founding Member on Signup
**File: `src/hooks/useAuth.tsx`**
- In `signUp()`, check if `localStorage.getItem('rally-founding25') === 'true'`. If so, pass `founding_member: true` in the `options.data` metadata.
- In `fetchProfile()`, add a post-signup check: if profile is < 24h old, `founding_member` is false, and `rally-founding25` is in localStorage, call an RPC to assign founding status. Clear the flag after.

**Database Migration:**
- Update `handle_new_user()` to check `raw_user_meta_data->>'founding_member'`. If `'true'`, set `founding_member = true` and auto-assign the next `founder_number` (SELECT COALESCE(MAX(founder_number), 0) + 1 from profiles WHERE founding_member = true, capped at 25).
- Create a small `claim_founding_spot(p_user_id uuid)` SECURITY DEFINER RPC for the post-OAuth path. It checks: profile < 24h old, founding_member is false, fewer than 25 founders exist. If valid, assigns founding_member + next founder_number.

### 3. Founding Member Testing Banner
**New file: `src/components/onboarding/FoundingMemberBanner.tsx`**
- A persistent, dismissible banner shown to users where `profile.founding_member === true`.
- Copy: "Welcome, Founding Member #X. You're one of the first 25. Test all core features and report bugs or feedback."
- Includes a "Report Feedback" button linking to `https://rally.canny.io`.
- Dismissible via localStorage flag `rally-founder-banner-dismissed`.

**File: `src/pages/Index.tsx`**
- Import and render `<FoundingMemberBanner />` below the header, gated on `profile?.founding_member === true`.

### 4. Tutorial Already Handled
The walkthrough already auto-triggers for profiles < 24 hours old. No changes needed — founding members will see the full tutorial including the "Going Rogue" step.

## Files Modified

| File | Change |
|---|---|
| **Migration** | Update `handle_new_user()` to read `founding_member` from metadata; create `claim_founding_spot()` RPC |
| `src/pages/Auth.tsx` | Capture `?ref=founding25` into localStorage |
| `src/hooks/useAuth.tsx` | Pass `founding_member` in signup metadata; post-OAuth founding claim |
| `src/components/onboarding/FoundingMemberBanner.tsx` | **New** — persistent testing banner with Canny link |
| `src/pages/Index.tsx` | Render FoundingMemberBanner for founding members |

## Your Invite Link
After implementation: **`https://rallyboyz.lovable.app?ref=founding25`**

