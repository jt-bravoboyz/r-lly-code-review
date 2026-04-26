## Caroline Polish — Finish-Line Implementation

Execute the 14 remaining edits + 1 SQL insert to fully ship all 6 polish items.

### 1. Identity Cleanup — kill "Anonymous" (9 files)

Replace every user-name fallback (`display_name || 'Anonymous'|'Unknown'|'Someone'|'User'|'DD'|'Passenger'|'the rider'|'the host'|'A DD'`) with `getPublicName(profile)` from `@/lib/identity`. Update `Avatar` fallback chars to derive from the public name.

Files:
- `src/components/chat/EventChat.tsx` — line 272–281 message bubble; also wrap avatar with `onClick={() => openProfile(message.sender_id)}`.
- `src/components/rides/RiderLine.tsx` — lines 142, 180 (`displayName: getPublicName(passenger)` / `getPublicName(p)`).
- `src/components/rides/RideRequestManager.tsx` — lines 142, 148, 172, 180, 207, 213; wrap passenger avatar with `openProfile`.
- `src/components/rides/IncomingRideRequests.tsx` — lines 38, 103, 110; wrap requester avatar.
- `src/components/rides/DDDropoffButton.tsx` — lines 87, 119, 124, 136.
- `src/components/rides/DDRequestBanner.tsx` — line 67.
- `src/components/rides/DDSetupDialog.tsx` — lines 326, 343, 511, 514.
- `src/components/rides/RequestRideDialog.tsx` — lines 110, 115.
- `src/components/rides/CreateRideDialog.tsx` — line 58.

Each file gets a top-level `import { getPublicName } from '@/lib/identity';` (and `usePublicProfile` where avatars become tappable).

### 2. Recently Friended row in invite dialogs (2 files)

- `src/components/events/CreateEventDialog.tsx` and `src/components/events/QuickRallyDialog.tsx`:
  - Import `useRecentlyFriended` from `@/hooks/useFriendships`.
  - Above the existing friends list, render a **"Recently Friended"** chip strip (max 8, horizontal scroll) with avatar + name. Tapping toggles selection in the same `selectedProfileIds` state used today.
  - Reorder section labels: **Recently Friended → All Friends → Invite Squads**. If `useRecentlyFriended` returns 0 rows, hide the section.

### 3. Avatar tap-to-open profile (5 sites)

Add `usePublicProfile()` and wrap each avatar with `onClick={() => openProfile(profile.id)}` + `cursor-pointer` + `aria-label`:
- `src/pages/EventDetail.tsx` — attendee chip strip.
- `src/pages/SquadDetail.tsx` — member list rows.
- `src/components/tracking/LiveMemberTracker.tsx` — member rows.
- `src/components/tracking/MemberLocationCard.tsx` — top avatar.
- `src/components/events/EventPhotoFeed.tsx` — uploader avatar.

### 4. Add `dedupe_key` to 3 edge functions

For every `notifications` insert in these functions, add `data.dedupe_key`:
- `supabase/functions/send-event-notification/index.ts` → `dedupe_key: \`event-notif:${eventId}:${type}:${recipientId}\``
- `supabase/functions/send-arrival-notification/index.ts` → `dedupe_key: \`arrival:${eventId}:${actorId}\``
- `supabase/functions/notify-car-group-rally-home/index.ts` → `dedupe_key: \`rally-home:${eventId}:${actorId}\``

The DB trigger silently drops repeats within 60s.

### 5. Send Caroline the thank-you notification (SQL insert via insert tool)

```sql
INSERT INTO public.notifications (profile_id, type, title, body, data, read)
SELECT
  p.id,
  'system_message',
  '⚡ You spoke, we r@llied, Caroline.',
  'Founding Member feedback shipped — no more "Anonymous" ghosts, cleaner alerts, auto-archive after 8h, tap-any-avatar profiles, and your badges are gleaming. Thanks for making R@lly sharper. 🧡',
  jsonb_build_object('dedupe_key', 'caroline-thanks-2026-04-26', 'sender', 'rally_team'),
  false
FROM public.profiles p
WHERE (p.full_name ILIKE 'Caroline Kay%' OR p.nickname ILIKE 'Caroline%')
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.profile_id = p.id
      AND n.data ->> 'dedupe_key' = 'caroline-thanks-2026-04-26'
  )
LIMIT 1;
```

### Verification after deploy
- `grep -r "|| 'Anonymous'" src/components/` → 0 hits.
- Open a chat → tap avatar → Public Profile Sheet opens.
- Open Create R@lly → see "Recently Friended" row at top.
- Confirm Caroline's notification row exists in DB.

Total: 9 + 2 + 5 + 3 = 19 file edits + 1 SQL insert. No new migrations.