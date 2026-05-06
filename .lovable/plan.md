## Profile Quick View + Friends — wiring pass

Good news: the heavy lifting is already built.
- `friendships` table + RLS exists (migration `20260424122921_…`).
- `useFriendships`, `useRequestFriend`, `useRespondToFriendRequest` hooks exist.
- `PublicProfileSheet` + `PublicProfileProvider` + `usePublicProfile()` already render a bottom-sheet "Quick View" card with avatar, founder badge, points, bio, and an Add Friend / Accept / Friends button.
- Sheet is mounted globally via `App.tsx`.

So this task is **wiring the tap targets**, not building from scratch.

---

### Scope of changes

**1. Make every name/avatar surface tap-to-open the Quick View.**
Audit and add `onClick={() => openProfile(profileId)}` (with `cursor-pointer`, stop-propagation where needed, and a11y `role="button"` / `tabIndex`) on:
- Event detail attendee chips/rows (`src/pages/EventDetail.tsx`)
- Live tracking + member cards (`MemberLocationCard`, `LiveMemberTracker`, `AttendeeLocationItem`)
- Rides surfaces (`RideCard`, `RideRequestManager`, `IncomingRideRequests`, `RiderLine`, `NavigateToPickupButton` driver row)
- Chat (`ChatView`, `EventChat`, `SquadChatSheet`) — sender avatar + name
- Photo feed credit line (`EventPhotoFeed`)
- Squad members (`SquadDetail`, `ContactsTab`, `SquadCard`)
- Recap "Hall of Fame" award winners + Squad Stars
- Notifications (friend request rows, invite cards) — tap requester to preview

For each surface, confirm the `profileId` (not `user_id`) is what's passed to `openProfile()`.

**2. Polish the Quick View itself (`PublicProfileSheet`)**
- Add a small "R@lly stats" row: events attended count + tier badge (if available via `safe_profiles` / existing badge hooks). If not cheap to fetch, defer.
- Show an inline "Decline" secondary button when state is `pending_incoming` (currently only Accept is offered).
- When viewing self, swap the action row for a "View your profile →" link to `/profile`.
- Glass/Liquid styling pass: `backdrop-blur-xl`, R@lly Orange accents, Montserrat headings, 44px touch targets, safe-area bottom padding.

**3. Friend request notification → tap opens Quick View**
In `Notifications.tsx`, when a `friend_request` notification is tapped, call `openProfile(data.requester_profile_id)` so the user can Accept inline.

**4. Shared helper**
Add `src/components/profile/ProfileTapWrapper.tsx` — a tiny wrapper `<button>` that takes `profileId` + children, handles stopPropagation, focus ring, and calls `openProfile`. Use it at every site above to keep behavior consistent.

---

### Out of scope (saved for later bundles per your answers)
- Age Block / DOB collection
- Public Event Feed tab
- QoL trio (photo toast, Uber deep-link, pinned media)

I'll plan those next once this lands. No DB migration is needed for this bundle — `friendships` and RLS are already in place.

### Files touched (estimate)
~12 component files + 1 new `ProfileTapWrapper.tsx` + small additions to `PublicProfileSheet.tsx`. No schema changes.
