

# Referral Loophole Fix & Reward Notifications

## What's Already Working
The standard signup flow (via `?r=`, `?referrer=`, `?invite=` URL params) **already captures referrals correctly**: Auth.tsx reads the param, persists it in sessionStorage, passes it to `signUp()`, which retries setting `profiles.referred_by` and calls `rly_award_points('referral_signup')`. No client code changes needed here.

## What's Missing
1. Squad invite codes don't trigger referral attribution
2. `rly_award_points` doesn't auto-create a notification — it's done client-side with inconsistent messaging
3. Susan and Thermus need manual data repair

---

## Database Migration (single file, 3 changes)

### A. Update `join_squad_by_invite_code`
After the existing `INSERT INTO squad_members` line, add:
- Fetch joiner's `created_at`, `referred_by`, `display_name` from `profiles`
- If `referred_by IS NULL` AND profile created within 24 hours:
  - Get squad `owner_id` from `squads` table
  - `UPDATE profiles SET referred_by = owner_id` for the joiner
  - Get owner's `user_id`, call `rly_award_points(owner_user_id, 'referral_signup', joiner_profile_id)`

### B. Update `rly_award_points`
After the existing `rly_recalc_user_badge` call (line 162 equivalent), add:
- If `p_event_type = 'referral_signup'` AND `v_row.id IS NOT NULL`:
  - Insert into `notifications` for the referrer's profile: title "🎉 Someone joined R@lly because of you!", body "Check your achievements to see your new points."

### C. Data Repair (via insert tool, not migration)
- Look up Susan Haddad and Nick's profile IDs
- Look up Thermus Butler and JT Butler's profile IDs
- Update `referred_by` for both
- Call `rly_award_points` for both referrers
- Call `rly_recalc_user_badge` for both referrers

## No Client Code Changes
The existing Auth.tsx + useAuth.tsx referral flow is complete. The new DB-level notification in `rly_award_points` will make the client-side notification insert redundant (but harmless — worst case the referrer gets two notifications, which is fine).

## Files Modified
- **Database migration**: `join_squad_by_invite_code` (add referral attribution), `rly_award_points` (add notification insert)
- **Data repair** (insert tool): `profiles` updates + point awards + badge recalcs for Nick/Susan and JT/Thermus

No changes to Auth.tsx, useAuth.tsx, or any other client files.

