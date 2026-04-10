

# Master Implementation: Onboarding, OAuth Recovery, Referrals, Password Security & Alerts

## 1. OAuth & Ghost User Recovery + Apple Relay Handling

### Database Migration
- **Update `handle_new_user()` trigger**: Add robust name fallback chain: `display_name` → `full_name` → `name` → email prefix. For `*@privaterelay.appleid.com` emails, skip the email prefix and default to `'R@lly Member'`.
- **Add `needs_name_setup` column** to `profiles` table (`boolean DEFAULT false`). Set to `true` when the display name ends up as `'R@lly Member'` or matches a gibberish Apple pattern.
- **Extract `referred_by`** from `raw_user_meta_data` during INSERT and set it on the profile. If present, call `rly_award_points()` for the referrer inline.
- **Backfill**: UPDATE Joey's profile (`user_id = ebed9c3f-...`) and any profiles with privaterelay emails to `display_name = 'R@lly Member'` and `needs_name_setup = true`.

### "Name Your Horse" UI — New Component
- Create `src/components/profile/NameSetupDialog.tsx`: A premium modal that appears when `profile.needs_name_setup === true`. Single input field: "What should we call you?" with a Save button. On save, updates `display_name` and sets `needs_name_setup = false`.
- Render this dialog in `src/pages/Index.tsx` (the landing page after auth), gated on `profile?.needs_name_setup === true`.

### Edit Username in Profile
- The Profile page (`src/pages/Profile.tsx`) already supports editing `display_name` via the existing edit mode. No additional work needed here — the user can already tap edit and change their name.

---

## 2. Tutorial Fix + Walkthrough Duplication Guard + Going Rogue Step

### File: `src/hooks/useTutorial.tsx`

**Auto-start logic (lines 208-232):**
- Import `profile` from `useAuth()` (currently only uses `user`).
- Replace the fragile `isNewSignup` localStorage check with: if `tutorial_complete !== 'true'` AND `profile.created_at` is within the last 24 hours, auto-start.
- **Duplication guard**: Also check `localStorage.getItem('rally-walkthrough-seen')`. If `'true'`, skip regardless of DB state. Set this flag in `endTutorial()` and `skipTutorial()`.

**New "Going Rogue" step** — insert after `rides-intro` (index 5), before `safety-intro`:
```
{
  id: 'going-rogue',
  title: 'GOING ROGUE',
  command: 'BREAK AWAY PROTOCOL',
  instruction: 'Going Rogue alerts your entire squad that you\'ve broken off from the group.\n\nYour crew can react with emojis, but heads up — going rogue removes you from the DD\'s auto-safety check.\n\nUse it when you\'re leaving the plan behind.',
  requiredAction: 'complete',
  position: 'center',
}
```

---

## 3. Referral Fix (Nick's Issue)

### File: `src/hooks/useAuth.tsx`
- In `signUp()`, add `referred_by` to the `options.data` metadata object. Remove the entire client-side retry loop (lines 121-148).
- In `fetchProfile()`, add a post-OAuth referral check: if profile is < 24h old, has no `referred_by`, and `rally-referrer-id` exists in localStorage, call an RPC to set the referral. Create a small `set_referral` RPC in the migration for this.

### Database Migration (same migration as #1)
- Create `set_referral(p_user_id uuid, p_referrer_id uuid)` SECURITY DEFINER function that sets `referred_by` on the profile and triggers `rly_award_points()` for the referrer. Checks that the profile is < 24h old to prevent abuse.

---

## 4. Password Security & UX

### File: `src/pages/Auth.tsx`
- Update `passwordSchema` (line 19): min 8 chars, require `\d` (one number), require one special character.
- Add a `PasswordChecklist` component below the password field during signup showing three rules with green/gray indicators.
- Update the Sign Up button's `disabled` to also check password validity.
- Update the password input `minLength` from 6 to 8.

---

## 5. Global Alert Toasts

### File: `src/hooks/useNotifications.tsx`
- Import `toast` from `sonner`.
- In the realtime INSERT handler (after updating query cache), check the notification type and fire appropriate toasts:
  - `rogue_alert` → `toast.warning()`
  - `dd_arrived` → `toast.success()`
  - `safety_alert` → `toast.warning()`
  - `event_invite` → `toast.info()`
  - `referral_success` → `toast.success()`
  - `rally_started` → `toast.info()`

---

## Files Modified

| File | Change |
|---|---|
| **Migration** | Update `handle_new_user()`, add `needs_name_setup` column, add `set_referral()` RPC, backfill Apple profiles |
| `src/components/profile/NameSetupDialog.tsx` | **New** — "Name Your Horse" dialog for Apple relay users |
| `src/pages/Index.tsx` | Render NameSetupDialog when `needs_name_setup` is true |
| `src/hooks/useTutorial.tsx` | Profile-age auto-start, duplication guard, Going Rogue step |
| `src/hooks/useAuth.tsx` | Pass `referred_by` in metadata, remove retry loop, add post-OAuth referral check |
| `src/pages/Auth.tsx` | Stricter password schema + live checklist UI |
| `src/hooks/useNotifications.tsx` | Toast on realtime INSERT for high-priority alerts |

## What Is NOT Touched

| Feature | Status |
|---|---|
| Existing point rules / ledger | Unchanged |
| RLS policies | Unchanged |
| Pre-auth onboarding slides | Unchanged |
| RecapTour / RecapTimeline | Unchanged |
| Profile page edit functionality | Already exists, unchanged |
| Google/Apple OAuth flows | Unchanged (only trigger handling improved) |

