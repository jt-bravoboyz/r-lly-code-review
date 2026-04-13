

# Plan: Add Referral Signup Alert for Referring User

## Overview

When a new user signs up via a referral link, create a notification for the referring user in their alerts tab confirming the referral and points credit.

## Steps

### 1. Update `handle_new_user` trigger (database migration)

After the `rly_award_points` call succeeds, insert a notification into `public.notifications` for the referring user:

```sql
INSERT INTO public.notifications (profile_id, type, title, body, data)
VALUES (
  _referred_by,
  'referral_success',
  _display_name || ' joined R@lly using your link.',
  'Your referral points have been credited.',
  jsonb_build_object('new_user_id', NEW.id)
);
```

This goes inside the existing `IF _referrer_user_id IS NOT NULL` block, right after the `PERFORM rly_award_points(...)` call. The `_referred_by` is the referrer's profile ID which is what the notifications table expects.

### 2. Add icon for `referral_success` in Notifications page

In `src/pages/Notifications.tsx`, add a case to `getNotificationIcon`:

```tsx
case 'referral_success':
  return <UserPlus className="h-5 w-5 text-green-500" />;
```

Import `UserPlus` from lucide-react.

### What does NOT change
- Referral point logic, signup flow, referral link system
- Any existing alert types or styling
- The notification card layout (uses the existing `SwipeDismissCard` + `Card` pattern)
- The real-time toast already handles `referral_success` type in `useNotifications.tsx`

