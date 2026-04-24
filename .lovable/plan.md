# Verify + Fix R@lly Friends Requests

## What I found

The UI pieces exist, but the flow is not actually visible/usable yet:

1. There are currently no friendship rows in the database, so no real friend request has been created yet.
2. The Contacts tab defaults to the **Squads** tab, so the new R@lly Search can be easy to miss.
3. Friend request notifications are being rendered in the regular notification list, but the current filtering only promotes squad/event invites to the top. Friend requests can get buried.
4. The public profile search is built on the `safe_profiles` view after it was switched to `security_invoker`, but the base `profiles` policies only allow users to view their own profile/admin profiles. That can make R@lly Search return nothing for normal users.
5. The friend request push is best-effort only. In-app notifications should be the reliable source of truth, and push should not be allowed to block or confuse the main request flow.

## Plan

### 1. Restore safe public profile search

Update the backend search function so normal signed-in users can search public profile fields only:

- `id`
- `display_name`
- `avatar_url`
- `bio`

It will remain privacy-safe and will not expose phone, email, location, or private profile fields.

### 2. Make friend requests visible in Notifications

Update `src/pages/Notifications.tsx` so unread `friend_request` notifications appear in the top actionable stack alongside event/squad invites.

Friend request cards will show:

- Request title/body
- Orange **Accept** button
- Secondary **Decline** button
- After accepting/declining, the notification is marked read and the friend lists refresh

### 3. Make Contacts friend status clearer

Update `src/components/squads/ContactsTab.tsx`:

- Change the search placeholder to make R@lly search obvious: `Search R@lly friends, handles, contacts...`
- Improve the empty R@lly Search state so users know if no app profile was found.
- Show incoming pending requests as an orange **Accept** button.
- Show outgoing pending as **Requested**.
- Show accepted as **Friends**.
- Update the R@lly Friends empty copy from only “Attend events to connect” to also mention searching by name/handle.

### 4. Harden friendship status updates

Update the friendship mutation behavior so both sides refresh correctly:

- Invalidate friendship and friend list queries broadly after request/accept/decline.
- When a user accepts or declines from notifications, refresh notifications and Contacts status.
- Keep the accepted-only behavior for the main R@lly Friends list.

### 5. Verify with live data

After implementation, verify the full lifecycle in the database and UI paths:

```text
User A searches User B
User A sends request
Database row = pending
User B gets friend_request notification
User B sees Accept / Decline
Accept -> friendship = accepted, both users see Friends
Decline -> friendship = declined, request no longer actionable
```

Because this needs real database writes and code changes, I’ll complete the verification after you approve this plan.