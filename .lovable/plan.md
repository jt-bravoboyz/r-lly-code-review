
## Fix plan: make invite alerts reliable and visible

### What’s actually broken
- `notifications` is currently empty, so the Alerts tab has nothing persistent to render.
- `send-event-notification` shows no recent executions, so invite alerts are not being created reliably through the backend function path.
- Squad creation currently inserts selected users directly into `squad_members`, which bypasses any invite/accept flow entirely.
- The Alerts badge already exists in `BottomNav`, but it is red and partially depends on `pendingInvites` instead of a single reliable unread-alert source.
- `useNotifications()` only subscribes to `INSERT`, so unread/read state is not fully real-time.

### Implementation approach
I’ll make the notifications table the single source of truth for invite alerts, then wire the badge and Alerts page to it.

### 1) Create notifications automatically in the database
Add backend-side database functions + triggers so alerts are created immediately when invites are inserted.

#### For R@lly invites
- Add an `AFTER INSERT` trigger on `event_invites`
- Insert a `notifications` row for `NEW.invited_profile_id`
- Store:
  - `type = 'event_invite'` (or normalize to one invite type consistently)
  - inviter name
  - rally title
  - `event_id`
  - `invite_id`
  - unread state

#### For squad invites
Because `squad_invites` only stores `contact_value`, the trigger function will:
- detect whether invite is email or SMS
- normalize phone numbers to digits / last 10 digits
- resolve matching profile(s) from `profiles` or matching user email
- insert a `notifications` row when the invited contact maps to an existing account
- safely do nothing if no app user matches yet

This removes dependence on the edge function for the core alert record.

### 2) Stop bypassing invites when creating squads
Update squad creation so selected members are not silently inserted into `squad_members`.

Instead:
- create the squad
- create `squad_invites` for selected app users/contacts
- let the database trigger create Alerts-tab notifications
- only add to `squad_members` after the user accepts

This fixes the “I was added but never alerted” gap.

### 3) Make Alerts tab render invite alerts from notifications only
Refactor `Notifications.tsx` so squad/rally invite cards come from `notifications` consistently.

Changes:
- use `InviteAlertCard` for both squad and rally invite notifications
- remove the separate `PendingInvites` dependency from the Alerts page to avoid split logic / duplicate paths
- keep existing visual layout, just make the data source reliable

### 4) Make Accept / Decline work correctly
Tighten `InviteAlertCard.tsx` so actions use the notification payload directly.

#### Squad invites
- accept via `join_squad_by_invite_code`
- decline by updating the matching `squad_invites` row to `declined`
- mark/delete the notification afterward

#### R@lly invites
- use `invite_id` from notification payload instead of querying “first pending invite by event”
- respond to the exact invite
- mark/delete the notification afterward

This prevents wrong-invite lookups and keeps alerts in sync.

### 5) Add a true unread orange badge on the Alerts tab
Update `BottomNav.tsx` so the Alerts icon badge:
- is orange
- uses unread `notifications` count as the primary source
- updates immediately when a notification is inserted/read/removed
- works for squad and rally invites automatically

### 6) Make real-time updates complete
Update `useNotifications()` realtime subscription to listen to:
- `INSERT`
- `UPDATE`
- `DELETE`

So:
- new invite appears instantly
- unread badge appears instantly
- badge clears immediately after accept/decline/read
- no refresh needed

### Files likely involved
- `src/hooks/useNotifications.tsx`
- `src/pages/Notifications.tsx`
- `src/components/notifications/InviteAlertCard.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/hooks/useSquads.tsx`
- possibly `src/components/squads/CreateSquadDialog.tsx` for submit copy/behavior
- new migration for trigger functions + triggers on `event_invites` / `squad_invites`

### Result after this fix
- Squad invites create a real Alerts item for existing app users
- R@lly invites create a real Alerts item immediately
- Alerts cards show inviter, squad/rally name, timestamp, unread state, and Accept/Decline
- The Alerts tab icon shows a small orange unread badge in real time
- Users no longer need to search manually for invites

### Technical notes
- I will use database triggers for reliability because the current function-based path is not executing consistently.
- I will keep RLS strict and create notification rows server-side in trigger functions.
- I will preserve the current UI structure and only change the invite data flow + badge behavior.

