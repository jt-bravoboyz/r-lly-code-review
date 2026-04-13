

# Fix: Referral Points Not Awarded on Signup

## Root Cause

The `handle_new_user` database trigger calls `rly_award_points` incorrectly in three ways:

1. **Wrong number of arguments** — passes 4 args `(_referred_by, 'referral', 50, NEW.id::text)` but the function only accepts 3 `(uuid, text, uuid)`
2. **Wrong event type** — uses `'referral'` but the point rules table has `'referral_signup'`
3. **Wrong ID type** — passes `_referred_by` which is a profile ID, but `rly_award_points` expects an auth user ID

The call silently fails inside the `EXCEPTION WHEN OTHERS THEN NULL` block, so no error is visible.

## Fix

One database migration to update the referral-awarding section of `handle_new_user`:

1. Look up the referrer's `user_id` from the profiles table using `_referred_by` (which is a profile ID)
2. Call `rly_award_points(v_referrer_user_id, 'referral_signup', NEW.id)` with the correct auth user ID, correct event type, and correct 3-argument signature

### What changes

```sql
-- Replace the current broken call:
PERFORM rly_award_points(_referred_by, 'referral', 50, NEW.id::text);

-- With:
DECLARE v_referrer_user_id uuid;
...
SELECT user_id INTO v_referrer_user_id FROM public.profiles WHERE id = _referred_by;
IF v_referrer_user_id IS NOT NULL THEN
  PERFORM public.rly_award_points(v_referrer_user_id, 'referral_signup', NEW.id);
END IF;
```

### What does NOT change
- Signup flow for new users
- Referral link generation or capture
- Point values (controlled by `rly_point_rules` table)
- Any other trigger or function

