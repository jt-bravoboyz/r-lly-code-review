## R@lly Social Blueprint — Phase 1

Connecting 1:1 DMs, social discovery, and consolidated alerts into the existing 5-tab shell. No new tabs, no new top-level pages.

## What's already in place (reusing, not rebuilding)

- `chats` / `chat_participants` / `messages` tables + `UnifiedChat` component with typing presence, reactions, and read receipts. Both `event_id` and `squad_id` are nullable, so the same schema can hold DMs.
- `friendships` table + `useFriendships` hooks + `friend_request` notifications + `InviteAlertCard` already render orange-glass accept/decline cards in `/notifications`.
- `Squads` page already has a Tabs shell (Squads / Contacts) — DMs slot in as a third pill.
- `BottomNav` already renders unread badge counters via `useNotifications`.

## 1. DMs inside the Squads tab

### Schema (single migration)

- Allow chats where `event_id IS NULL AND squad_id IS NULL` and `is_group = false` (DM rows). Add a generated `dm_key text` column = `LEAST(p1,p2) || ':' || GREATEST(p1,p2)` derived from `chat_participants`, plus a partial unique index so each pair has at most one DM chat.
- Add nullable `read_at timestamptz` to `chat_participants` for per-user read-receipt cursor (group reads continue to use `message_reads`; for DMs we use this single cursor — fast and cheap).
- New RPC `get_or_create_dm_chat(p_other_profile_id uuid) returns uuid` — SECURITY DEFINER. Requires `auth.uid()` resolves to a profile, refuses self-DM, locks on the alphabetical composite key, inserts the chat row + both `chat_participants` rows, returns the chat id (idempotent).
- New RPC `list_my_dm_chats()` returning `chat_id, other_profile_id, other_display_name, other_avatar_url, last_message_text, last_message_at, unread_count`. SECURITY DEFINER, scoped to caller.
- RLS additions on `messages` and `chats`: DM participants (rows in `chat_participants` for that chat) can SELECT/INSERT messages where `chat_id` belongs to a DM chat. Existing event/squad policies stay intact.
- Realtime: add `chats`, `chat_participants` to `supabase_realtime` publication (messages already there).

### Frontend

- New `src/hooks/useDirectMessages.tsx`: `useMyDmChats()` (calls `list_my_dm_chats`) + `useOpenDmChat(otherProfileId)` (calls `get_or_create_dm_chat`) + `useMarkDmRead(chatId)` (updates `chat_participants.read_at = now()`).
- `Squads.tsx`: change `TabsList` from `grid-cols-2` to `grid-cols-3` — pills become **Squads / Messages / Contacts** with the existing premium glass pill treatment. New `<TabsContent value="messages">` renders a `DmList` component with last-message preview, relative timestamp, unread orange dot, and avatar.
- New `src/components/chat/DirectMessageSheet.tsx`: a `Sheet` (slide-up drawer, `side="bottom"`, `h-[92dvh]`) wrapping `UnifiedChat` with `chatType="dm"`. Opens on:
  1. Tap of a DM row in the Messages sub-tab.
  2. Tap of "Message" CTA on `PublicProfileSheet` / `ProfileTapWrapper` profile card.
- Add `chatType: 'dm'` to `src/components/chat/unified/types.ts` so the storage path and read-tracking hook can branch.
- Typing presence + delivery already work via Supabase channels in `UnifiedChat` (per-`chatId` broadcast channel). Read receipts: extend `useMessageReads` to also write `chat_participants.read_at` on DM open and on every visible message in the DM path.

## 2. "People You May Know" in the Contacts sub-tab

- New RPC `get_people_you_may_know(p_limit int default 20)`: returns up to N profiles you are **not** friends with, sorted by mutual-friend count, with `mutual_count`, `mutual_sample_names[]` (top 2 names) for the caption. Excludes self, already-pending/accepted friendships, and blocked.
- New `src/components/contacts/PeopleYouMayKnowCarousel.tsx`: horizontal `overflow-x-auto snap-x` strip rendered at the top of `ContactsTab`. Each card shows avatar, display name, micro-caption `Friends with JT and 2 others`, single-tap **+ Add** that calls `useRequestFriend` (already exists) and morphs to "Request sent" on success.

## 3. Alerts tab consolidation

The alerts page (`/notifications`) already pulls friend_request into `inviteNotifications` and renders `InviteAlertCard`. Two refinements:

- Promote friend-request `InviteAlertCard` to a slightly stronger orange-glass treatment (already orange — tighten ring + `shadow-[0_0_30px_rgba(244,122,25,0.35)]` and ensure Accept/Ignore are 44px touch targets) — pure styling pass, no logic change.
- New notification type `dm_message` emitted by an `AFTER INSERT` trigger on `messages` when `chat_id` is a DM (event_id IS NULL AND squad_id IS NULL). Title = sender display name, body = first 80 chars, `data.chat_id` + `data.sender_profile_id`. Tapping it opens the `DirectMessageSheet`. Dedupe key = `dm:<chat_id>` so multiple incoming texts collapse into one alert row.
- `useNotifications` already aggregates `chat_unread` types into the BottomNav badge — extend the type list to include `dm_message`, so the bottom-nav indicator naturally lights up for unread DMs.

## File touch list

```
supabase/migrations/<ts>_dm_chats_and_pymk.sql   (new)
src/hooks/useDirectMessages.tsx                  (new)
src/components/chat/DirectMessageSheet.tsx       (new)
src/components/contacts/PeopleYouMayKnowCarousel.tsx (new)
src/components/chat/unified/types.ts             (add 'dm')
src/components/chat/unified/useMessageReads.ts   (DM read cursor)
src/pages/Squads.tsx                             (3-col tabs + Messages tab)
src/components/squads/ContactsTab.tsx            (mount PYMK carousel)
src/components/notifications/InviteAlertCard.tsx (orange-glass polish)
src/pages/Notifications.tsx                      (route dm_message taps to sheet)
src/hooks/useNotifications.tsx                   (include dm_message in unread)
src/components/profile/PublicProfileSheet.tsx    (wire "Message" button → DM sheet)
```

## Verification

- DM open from a profile card → row appears in Squads → Messages → tap reopens sheet with history.
- Two browsers, two accounts: text → recipient sees orange dot in Messages list + unread badge on bottom nav + `dm_message` row in `/notifications`; typing dots animate live; read receipt clears badge after opening.
- PYMK strip surfaces a mutual friend with correct caption; Add → row disappears next refresh and recipient gets a `friend_request` alert card.
- No regression in existing event/squad chats (same `UnifiedChat`, same RLS scopes).

## Out of scope (separate follow-ups)

- DM media attachments beyond what `UnifiedChat` already supports.
- Block / mute UX (table can be added later; PYMK + DM RPCs already leave a clean spot for it).
- Push-notification fan-out for DMs (the trigger writes a `notifications` row; the existing push pipeline already mirrors notifications — confirm during verification, no new code expected).
