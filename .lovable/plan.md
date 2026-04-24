
# R@lly Friends + Name/Invite Fixes

## 1. Fix Bradley’s Name

Update Bradley’s profile record from:

- `Bradley`

To:

- `Bradley Wilson`

Also keep `needs_name_setup = false` so Bradley is not prompted again.

## 2. Require First + Last Name for New Users

Tighten the signup and identity setup flow so new users cannot finish with only one name.

### Changes

- Update signup validation so the name must contain at least two parts.
- Change the signup name placeholder from generic `Name` to `First and last name`.
- Keep the existing `IdentitySetupDialog` split into `First Name` and `Last Name`.
- Update backend profile creation so email-prefix fallback names are treated as incomplete and flagged with `needs_name_setup = true`.
- Existing OAuth users with `R@lly Member`, empty names, or email-style fallback names still get the first/last name dialog.

### Files

- `src/pages/Auth.tsx`
- `src/components/profile/NameSetupDialog.tsx`
- Database function: `handle_new_user()`

## 3. Fix Shared R@lly Link Join After Login

The join flow currently loses or bypasses the pending invite in some login paths.

### Changes

- Store pending R@lly invite codes consistently in `localStorage`.
- Update `/auth/return` to read the same key as `/auth`.
- Prevent `AuthRedirectGuard` from sending users to `/` when a pending R@lly code exists.
- After login, auto-join using:

```ts
request_join_event({
  p_event_id: event.id,
  p_has_invite_code: true
})
```

- If already attending, send the user straight to the R@lly.
- If join fails, send them back to `/join/:code` with a useful toast.

### Files

- `src/components/AuthRedirectGuard.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ReturningAuth.tsx`
- `src/pages/JoinRally.tsx`

## 4. Add Mutual “R@lly Friends”

Create a real mutual friendship system where a friendship becomes active only after acceptance.

### Database

Create `public.friendships`:

```text
id
requester_id
recipient_id
status: pending | accepted | declined | blocked
requested_at
responded_at
created_at
updated_at
```

Rules:

- `requester_id` and `recipient_id` reference profile IDs.
- Users cannot friend themselves.
- Only one friendship row can exist per pair.
- RLS protects access:
  - Users can see friendship rows where they are requester or recipient.
  - Users can create requests only as themselves.
  - Recipients can accept/decline.
  - Either side can remove/decline where appropriate.

Add helpful indexes for requester, recipient, status, and active friend lookups.

## 5. Friend Request Notifications

When User A requests User B:

- Insert an in-app notification for User B.
- Notification type: `friend_request`.
- Payload includes:
  - `friendship_id`
  - `requester_profile_id`
  - requester display name/avatar public metadata

Add Accept / Decline actions to the notification UI.

### Push

- Add friend-request support to the push notification flow.
- Allow push notifications when the target is the recipient of a pending friendship request.
- On request creation, send a push:
  - Title: `New R@lly Friend request`
  - Body: `{Name} wants to add you on R@lly`
  - Data: `{ type: 'friend_request', friendship_id }`

### Files

- New/updated database trigger for friendship notifications
- `src/hooks/useNotifications.tsx`
- `src/pages/Notifications.tsx`
- `supabase/functions/send-push-notification/index.ts`

## 6. Search Profiles by Handle in Contacts

Add a search experience to the Contacts tab that finds R@lly users by public handle/display name.

### Privacy

Search only uses public profile fields:

- `id`
- `display_name`
- `avatar_url`
- `bio`

Use the existing safe public profile surface, not raw private profile fields.

### UX

In `ContactsTab`:

- Keep the existing contacts search bar.
- When the user types a handle/name, show a `R@lly Search` result section.
- Each result has:
  - Avatar
  - Display name
  - Bio preview
  - Orange `Add Friend` / `Requested` / `Friends` button
- Hide the current user from results.
- Do not expose phone, email, address, or private location data.

### Files

- `src/components/squads/ContactsTab.tsx`
- New hook: `src/hooks/useFriendships.tsx`
- Existing hook update: `src/hooks/useRallyFriends.tsx`

## 7. Make Accepted Friends First in Event Creation

When starting a new R@lly, accepted R@lly Friends should appear before squads.

### Standard Create R@lly

In `CreateEventDialog`:

- Add a `R@lly Friends` invite section above `Invite Squads`.
- Accepted friends appear first.
- Users can select individual friends.
- On create, selected friends receive event invites.
- Keep squad selection optional.

### Quick R@lly

Apply the same friend-first invite picker to `QuickRallyDialog`.

### Files

- `src/components/events/CreateEventDialog.tsx`
- `src/components/events/QuickRallyDialog.tsx`
- `src/hooks/useRallyFriends.tsx`

## 8. R@lly Orange Buttons

Use the established R@lly Orange styling for all new friend actions:

- Add Friend
- Requested
- Accept
- Decline secondary styling
- Invite selected friends during creation

Primary action buttons use the project’s orange token / `gradient-primary` / `#F47A19` styling.

## Implementation Order

1. Update Bradley’s profile data.
2. Add the `friendships` table, RLS policies, indexes, and notification trigger.
3. Add friendship hooks and mutations.
4. Fix join-link persistence after login.
5. Tighten first/last name validation.
6. Add Contacts tab profile search + friend request buttons.
7. Add Accept/Decline notification actions.
8. Prioritize accepted friends in Create R@lly and Quick R@lly.
9. Run build/type checks and verify the main flows.
