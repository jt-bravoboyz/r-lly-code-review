# Caroline Kay's Founder Feedback — 6 Polish Items

A focused pass to fix identity gaps, notification noise, invite UX, profile depth, R@lly lifecycle, and badge rendering.

---

## 1. Identity in Chat & Rides (no more "Anonymous")

**Why it's broken:** Chat bubbles fall back to "Anonymous" when the `sender` join is missing or `display_name` is empty. Ride cards already show name + avatar but use `display_name` (which now resolves to nickname via the DB trigger). Some legacy spots still look thin.

**Changes:**
- `ChatView.tsx` — replace the inline `display_name || 'Anonymous'` with the new `getPublicName()` helper from `src/lib/identity.ts` so messages always render Nickname → full_name → "R@lly Member" (never "Anonymous").
- `useChat.tsx` / `useSquadChat.tsx` — extend the message `select` to pull `nickname, full_name, display_name, avatar_url` so the helper has everything it needs.
- `RideCard.tsx`, `RiderLine.tsx`, `IncomingRideRequests.tsx` — swap `passenger?.display_name` / `driver?.display_name` reads to `getPublicName(passenger)` / `getPublicName(driver)`. Ensure every avatar passes `avatar_url` and a 1-letter fallback derived from the public name.
- Add a tiny shared `<UserChip name avatar />` component so chat, rides, and the new profile card stay visually consistent.

---

## 2. Notification Cleanup (kill duplicates)

**Why it's broken:** Several flows fire both a DB insert and an edge function that inserts again, and rapid event updates can fire the same notification twice within seconds.

**Changes:**
- **DB-level dedupe:** add a partial unique index on `notifications (profile_id, type, (data->>'event_id'), (data->>'dedupe_key'))` for rows created in the last 60s, plus a `BEFORE INSERT` trigger that drops a row when an identical `(profile_id, type, dedupe_key)` already exists in the last 60 seconds. Any insert with no `dedupe_key` is allowed through (back-compat).
- **Edge function side:** `send-event-notification`, `send-arrival-notification`, `notify-car-group-rally-home` — every payload that creates a `notifications` row now sets `data.dedupe_key` (e.g. `rally-home:{event_id}:{actor_id}`, `ride-accept:{ride_id}:{passenger_id}`, `bar-hop:{event_id}:{stop_order}`). Identical payloads within the dedupe window are silently skipped.
- **Chat push:** `useChat.useSendMessage` already pushes to all participants — switch the `tag` to `chat-{chatId}-{senderId}-bucket` so the OS collapses bursts into one banner.
- Add an admin debug entry in `useNotifications` that logs (dev only) when a notification is dropped as duplicate.

---

## 3. Smart Invite List — Friends First, Then Squads

**Where:** `CreateEventDialog.tsx` audience picker (and mirror the same order in `QuickRallyDialog.tsx`).

**Changes:**
- Add a "Recently Friended" section at the top, sourced from `useFriendships` filtered to `status='accepted'` and sorted by `responded_at desc`, then enriched via `safe_profiles` for names + avatars. Cap at 8 chips with a "See all" expander.
- Existing **R@lly Friends** section stays second (renamed "All Friends").
- **Squads** moves to third.
- Update the section copy: "Recently Friended" → "All Friends" → "Invite Squads".
- New helper `useRecentlyFriended(limit=8)` in `useFriendships.tsx` to keep the dialog clean.

---

## 4. Public Profile Card (tap any avatar)

**New component:** `src/components/profile/PublicProfileSheet.tsx` — bottom sheet on mobile, dialog on desktop. Shows:
- Large avatar, public name (nickname), Founding Member chip if applicable, current tier badge, points.
- Bio (`safe_profiles.bio`).
- Earned activity badges row (top 6).
- Action button: **Add Friend** / **Requested** / **Friends** / **Accept** — driven by `getFriendshipState` + `useRequestFriend` / `useRespondToFriendRequest`.
- Secondary "Message" button when already friends (opens DM — defer wiring if no 1:1 chat exists yet; show toast "Coming soon").

**New context:** `PublicProfileProvider` in `src/contexts/PublicProfileContext.tsx` exposing `openProfile(profileId)`. Mounted once in `App.tsx` so any avatar anywhere can call it without prop drilling.

**Wire-up (avatar → tap):**
- `ChatView.tsx` message bubble avatars
- `RideCard.tsx` driver + passenger avatars
- `RiderLine.tsx`, `IncomingRideRequests.tsx`
- `EventDetail.tsx` attendee strip
- `SquadDetail.tsx` member list
- `LiveMemberTracker.tsx` / `MemberLocationCard.tsx`
- `EventPhotoFeed.tsx` photo uploader avatar

Each gets `onClick={() => openProfile(profile.id)}` plus `cursor-pointer` and `aria-label="View {name}'s profile"`.

**Privacy:** Card pulls from the existing `safe_profiles` view (no email/phone exposure).

---

## 5. Auto-End R@llies After 8 Hours

**Goal:** Any R@lly that's been `live` or `after_rally` for 8+ hours gets auto-archived to `completed` so the feed stays clean and recap flows fire.

**Changes:**
- New SQL function `public.auto_complete_stale_rallies()` — `SECURITY DEFINER`, runs:
  ```sql
  UPDATE events
  SET status = 'completed', updated_at = now()
  WHERE status IN ('live','after_rally','scheduled')
    AND COALESCE(end_time, start_time) < now() - interval '8 hours'
    AND status <> 'completed';
  ```
  Returns the list of completed event IDs.
- Schedule via `pg_cron` to run every 15 minutes:
  ```sql
  SELECT cron.schedule('auto-complete-stale-rallies', '*/15 * * * *',
    $$ SELECT public.auto_complete_stale_rallies(); $$);
  ```
- When a rally auto-completes, also:
  - Mark any still-open `rides` for that event as `ended`.
  - Insert a one-shot `notifications` row to the host: "Your R@lly auto-archived after 8 hours" with `dedupe_key='auto-archive:{event_id}'`.
- Frontend: `useEvents` already filters `status='completed'` out of Live/Upcoming, so no UI change needed beyond a small `EndRallyDialog` copy update mentioning the 8-hour rule.

---

## 6. Badge Rendering Fix on Profiles

**What's actually wrong:** All founding members have an empty `badges: {}` array, so the "Legacy Badges" block in `Profile.tsx` (line 523) never renders the Founding Member token. The Founding Member chip *does* render separately from `profile.founding_member` — but the activity badges section silently hides whenever the array is empty, and other people viewing a profile see nothing because `useActivityBadges` is keyed to the *current* user, not the profile being viewed.

**Changes:**
- **Backfill:** seed `profiles.badges` for every `founding_member = true` row with `'founding_member'` (and `'founder_{n}'` if a number exists). Handled via a one-time `INSERT/UPDATE` in the migration.
- **Hook refactor:** `useActivityBadges(profileId?: string)` — accept an optional target profile so the new `PublicProfileSheet` can render that user's earned badges, not the viewer's.
- **Profile page:** when rendering the legacy badges row, normalize known keys (`founding_member`, `founder_25`, etc.) through a `getBadgeMeta()` helper in `src/lib/badges.ts` so each chip gets the right icon/gradient instead of raw text.
- Verify `MiniFounderGem` uses `useFounderIds()` (already cached) — no change needed.

---

## Files Touched

**New**
- `src/components/profile/PublicProfileSheet.tsx`
- `src/contexts/PublicProfileContext.tsx`
- `src/components/ui/UserChip.tsx`
- `supabase/migrations/<ts>_caroline_polish.sql`

**Edited**
- `src/components/chat/ChatView.tsx`
- `src/hooks/useChat.tsx`, `src/hooks/useSquadChat.tsx`
- `src/components/rides/RideCard.tsx`, `RiderLine.tsx`, `IncomingRideRequests.tsx`
- `src/components/events/CreateEventDialog.tsx`, `QuickRallyDialog.tsx`
- `src/hooks/useFriendships.tsx` (add `useRecentlyFriended`)
- `src/hooks/useBadgeSystem.tsx` (accept optional profileId)
- `src/lib/badges.ts` (add `getBadgeMeta`)
- `src/pages/Profile.tsx` (legacy badge chips)
- `src/App.tsx` (mount `PublicProfileProvider`)
- `supabase/functions/send-event-notification/index.ts`
- `supabase/functions/send-arrival-notification/index.ts`
- `supabase/functions/notify-car-group-rally-home/index.ts`
- `src/components/events/EndRallyDialog.tsx` (copy)

**Migration scope**
- `notifications` dedupe trigger + index
- `auto_complete_stale_rallies()` function + `pg_cron` schedule
- Backfill `profiles.badges` for founding members

No breaking API changes. All RLS policies unchanged (the new function uses `SECURITY DEFINER`).
