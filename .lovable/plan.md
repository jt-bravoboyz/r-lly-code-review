

# Final Referral Audit & Real-Time Alerts

## Scope Confirmation
Only these 2 files will be modified. No CSS, squad_media, PolicyAcceptanceDialog, or squad-joining logic will be touched.

## Changes

### 1. `src/hooks/useAdminData.tsx` — Backfill Historical Referrals

The existing `referralDetails` logic (lines 358-366) already scans all profiles with `referred_by` and maps names. However, it depends on `referred_by` matching a profile `id` in the same array. This is already correct — the `.range(0, 9999)` fetch on line 35 pulls all profiles with `referred_by` included.

**No change needed here** — the current logic already shows every historical referral mapped by name. The data is complete.

### 2. `src/hooks/useAuth.tsx` — Add Referral Notification + Toast

After the successful `rly_award_points` call (line 147), add two things:

**a) Insert a notification record for the referrer:**
```ts
await supabase.from('notifications').insert({
  profile_id: referredBy,  // referrer's profile ID
  type: 'referral_reward',
  title: `${displayName} has joined R@lly! 10 points have been added to your account.`,
  body: 'Keep sharing to earn more rewards!',
  data: { referee_id: profile.id },
});
```

Note: `referredBy` here is already a profile ID (the `referred_by` column stores profile IDs), and `displayName` is the new user's display name passed to `signUp()`.

**b) No client-side toast needed** — the referrer is a different user on a different session. The notification will appear via the existing real-time notification subscription (`useNotifications` hook with postgres_changes listener). When the referrer is online, they'll see the notification appear in real-time.

### Summary
- **`useAdminData.tsx`**: No changes needed — already complete.
- **`useAuth.tsx`**: Add ~8 lines after line 147 to insert a notification for the referrer after points are awarded.
- **`ReferralAudit.tsx`**: No changes needed.
- **`AdminDashboard.tsx`**: No changes needed.

Only 1 file modified. Fully isolated to the referral/notification system.

