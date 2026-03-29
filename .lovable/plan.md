

# Implement Complete Invite Notification System

## Problem
1. **Squad invites** produce NO in-app notification — only external SMS/email. Existing app users never know they were invited unless they check manually.
2. **R@lly invites** already create push + DB notifications via `send-event-notification`, but the Alerts tab shows them via a separate `PendingInvites` component that only handles R@lly invites — no squad invite cards.
3. No actionable Accept/Decline buttons on notification cards in the Alerts tab.

## Solution

### 1. Add Squad Invite Notifications (Backend)
**File: `src/components/squads/SquadInviteDialog.tsx`**
- After successfully inserting a `squad_invites` record, check if the invited contact matches an existing user in the database (by phone or email in `profiles`).
- If a matching profile is found, insert a notification into the `notifications` table with:
  - `type: 'squad_invite'`
  - `title: "{inviter} invited you to join {squadName}"`
  - `body: "Tap to view and respond"`
  - `data: { squad_id, invite_code }`
- Also attempt to send a push notification via `send-event-notification` edge function (add `squad_invite` as a valid type).

### 2. Update Edge Function to Support Squad Invites
**File: `supabase/functions/send-event-notification/index.ts`**
- Add `'squad_invite'` to `VALID_NOTIFICATION_TYPES`.
- Add handler logic: when `type === 'squad_invite'`, auto-generate title/body from `squadName` and `invitedBy` fields.
- For authorization, verify caller is a squad member (query `squad_members` table).
- Map preference to `squad_invites` column.

### 3. Create Unified Invite Alert Cards on Notifications Page
**File: `src/components/notifications/InviteAlertCard.tsx`** (new)
- A new component that renders invite-type notifications with Accept/Decline buttons.
- For `squad_invite` type: Accept calls `join_squad_by_invite_code` RPC, Decline marks notification as read.
- For `rally_invite`/`event_invite` type: Accept calls `useRespondToInvite`, Decline same.
- Card design: slightly stronger visual weight — primary/10 left border accent, inviter avatar, timestamp.

### 4. Update Notifications Page
**File: `src/pages/Notifications.tsx`**
- In the notification list, detect `type === 'squad_invite'` or `type === 'rally_invite'` notifications.
- Render those using the new `InviteAlertCard` instead of the generic notification card.
- Keep `PendingInvites` component for R@lly invites that come via the `event_invites` table (backward compatibility), but also show invite-type notifications from the `notifications` table.
- Sort unread invite notifications to the top.

### 5. Update Notification Icon Map
**File: `src/pages/Notifications.tsx`**
- Add `squad_invite` to `getNotificationIcon` — use `Users` icon with primary color.

### 6. Real-Time Updates (Already Working)
- The existing realtime subscription in `useNotifications` already listens for `INSERT` on the `notifications` table filtered by `profile_id` — new squad invite notifications will appear instantly.

### 7. Unread Badge
- Already handled by `useUnreadCount` which counts `!n.read` notifications.

## Technical Details

### Edge Function Changes
- New valid type: `squad_invite`
- New payload fields: `squadId`, `squadName`
- Authorization path: verify caller is in `squad_members` for the given `squadId`
- Notification URL: `/join-squad/{invite_code}`

### New Component: `InviteAlertCard`
- Props: notification object
- Extracts `squad_id`, `invite_code`, `event_id` from `notification.data`
- Accept button: performs join action, then marks notification read
- Decline button: marks notification read (and optionally updates invite status)
- Uses confetti on accept (existing `useConfetti` hook)

### Files Modified
1. `supabase/functions/send-event-notification/index.ts` — add squad_invite support
2. `src/components/squads/SquadInviteDialog.tsx` — trigger notification on invite
3. `src/components/notifications/InviteAlertCard.tsx` — new actionable invite card
4. `src/pages/Notifications.tsx` — render invite cards, add squad_invite icon
5. `src/hooks/useNotifications.tsx` — no changes needed (already generic)

