

# Automated Referral Attribution — Fail-Safe Trigger + Data Repair

## Summary
Create a database trigger that fires whenever `profiles.referred_by` is set (on INSERT or UPDATE), automatically awarding points and sending notifications. Also upgrade Auth.tsx to use localStorage for referral persistence, and repair Steven Haddad's missing attribution.

---

## 1. Database Migration: Auto-Referral Trigger

Create a new function `rly_auto_referral_on_profile_change()` and trigger on `profiles`:

**Trigger fires**: `AFTER INSERT OR UPDATE OF referred_by ON profiles`

**Logic**:
- If `NEW.referred_by IS NOT NULL` and (on INSERT, or on UPDATE where `OLD.referred_by IS NULL`)
- Look up referrer's `user_id` from `profiles` where `id = NEW.referred_by`
- Call `rly_award_points(referrer_user_id, 'referral_signup', NEW.id)` — this already handles duplicate prevention via the `ON CONFLICT` clause and auto-sends the notification
- This makes the entire referral reward chain fire at the database level, regardless of whether the frontend succeeds

This is the "set and forget" safety net. Even if the client-side code in `useAuth.tsx` fails, the moment `referred_by` is written, the trigger handles everything.

## 2. Client Code: LocalStorage Persistence (`Auth.tsx`)

Change referral storage from `sessionStorage` to `localStorage`:
- `sessionStorage.setItem('rally-referrer-id', r)` → `localStorage.setItem('rally-referrer-id', r)`
- `sessionStorage.getItem('rally-referrer-id')` → `localStorage.getItem('rally-referrer-id')`
- Clear it after successful signup to avoid stale data

## 3. Client Code: Simplify `useAuth.tsx`

Since the DB trigger now handles point awarding and notifications automatically when `referred_by` is set, simplify the signup flow in `useAuth.tsx`:
- Keep the retry loop that sets `profiles.referred_by` (this is still needed)
- Remove the manual `rly_award_points` RPC call and the manual notification insert — the trigger handles both
- This eliminates the "double notification" edge case

## 4. Data Repair (via insert tool, not migration)

**Steven Haddad → Nick Haddad**:
- Look up Steven Haddad's profile ID and Nick Haddad's profile/user ID
- `UPDATE profiles SET referred_by = [Nick's profile ID] WHERE display_name = 'Steven Haddad'`
- The new trigger will auto-fire, awarding Nick 10 pts and sending the notification
- The `rly_friends` view (via `useRallyFriends.tsx`) will automatically pick up the relationship

**Global 48-hour audit**:
- Query all profiles created in last 48 hours with `referred_by IS NOT NULL`
- Check if corresponding `referral_signup` entries exist in `rly_points_ledger`
- Award missing points for any gaps

## Files Modified
- **Database migration**: new trigger function `rly_auto_referral_on_profile_change` + trigger on `profiles`
- **`src/pages/Auth.tsx`**: `sessionStorage` → `localStorage` for referral ID (3 lines)
- **`src/hooks/useAuth.tsx`**: remove manual `rly_award_points` call and notification insert from signup flow (keep the `referred_by` UPDATE)
- **Data repair** (insert tool): Steven Haddad linkage + 48-hour audit

