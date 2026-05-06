## Goal

Anywhere a person's name or avatar appears — inside an event (R@lly) or in the Friends/Contacts surfaces (R@lly Friends, Squad Members, search results) — tapping it opens the existing global **Profile Quick View** sheet (`PublicProfileSheet`) with their info and Add/Accept Friend actions.

The Quick View sheet, `PublicProfileProvider`, `usePublicProfile()` hook, and `ProfileTapWrapper` helper are already built and mounted globally. This pass just wires the remaining surfaces.

Note on hover: this is a mobile-first PWA, so "hover" isn't a primary input — we'll add `hover:opacity-80 cursor-pointer` styling on desktop, but the actual trigger is tap/click. If you want a true desktop hover-card with no tap, tell me and I'll layer one on top.

## What's already wired (no change)

- `EventDetail` attendees / host / co-hosts
- `RideCard`, `RideRequestManager`, `IncomingRideRequests`
- `MemberLocationCard`, `EventChat`, `ChatView`, `EventPhotoFeed`
- `SquadDetail` member rows
- `Notifications` friend-request rows

## What this pass adds

### 1. R@lly Friends list (`src/components/squads/ContactsTab.tsx`)
- Wrap each friend row's avatar+name block in `ProfileTapWrapper` with `friend.id`.
- Wrap each search result row (`rallySearchResults`) avatar+name block with `result.id`.
- Wrap each `SquadMemberGroup` member row (avatar+name) with `member.profile_id`.
- Stop-propagation so tapping the row doesn't fire the Collapsible toggle, and the Add/Invite buttons remain independently clickable.

### 2. Squad list cards (`src/components/squads/SquadCard.tsx`)
- If member avatar stack is shown, wrap each mini-avatar in `ProfileTapWrapper` so tapping a face opens that profile (without navigating to the squad).

### 3. Add People sheet (`src/components/contacts/AddPeopleSheet.tsx`)
- Wrap any existing-R@lly-user search result rows so the user can preview before sending an invite/friend request.

### 4. Find Friend nav view (`src/components/navigation/FindFriendView.tsx`)
- Wrap the header avatar + "Find {displayName}" title in `ProfileTapWrapper` with `member.profileId`.

### 5. Tracking surfaces
- `src/components/tracking/AttendeeMap.tsx` — popups/list rows wrap names with `ProfileTapWrapper`.
- Any `LiveMemberTracker` / `AttendeeLocationItem` rows missing the wrapper get it.

### 6. Rider Line (`src/components/rides/RiderLine.tsx`)
- Wrap each rider row's avatar+name with `ProfileTapWrapper`.

### 7. Home surface (`src/components/home/RidePlanCard.tsx`, `RallyHomeButton.tsx`)
- Wrap driver/passenger avatars+names where present.

### 8. Visual affordance
- In `ProfileTapWrapper`, add subtle `hover:opacity-80 active:scale-[0.98] transition` so it feels tappable on both desktop hover and mobile press. No layout changes.

## Out of scope (saved for later)

- True desktop hover-card (tooltip-style preview without click)
- Age block / DOB collection
- Public Event Feed
- Pinned media

## Files touched

- `src/components/profile/ProfileTapWrapper.tsx` (small style tweak)
- `src/components/squads/ContactsTab.tsx`
- `src/components/squads/SquadCard.tsx`
- `src/components/contacts/AddPeopleSheet.tsx`
- `src/components/navigation/FindFriendView.tsx`
- `src/components/tracking/AttendeeMap.tsx`
- `src/components/rides/RiderLine.tsx`
- `src/components/home/RidePlanCard.tsx`, `RallyHomeButton.tsx` (only if names render)

No DB / RLS / migration changes. No new dependencies.
