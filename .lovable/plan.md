## Dedupe Rally Invite Alerts — Surgical Fix

Right now every rally invite produces **two** alert rows (DB trigger fires `event_invite`, edge function inserts `rally_invite`), and each new inviter creates fresh rows on top of those. Goal: one alert row per `(recipient, rally)`, updated in place as more people invite.

### Root causes (confirmed in code)

1. `supabase/migrations/...notify_on_event_invite` — DB trigger on `event_invites` INSERT creates one `event_invite` notification per row, no dedupe.
2. `supabase/functions/send-event-notification/index.ts` (called from `useCreateEventInvites`) inserts a second `rally_invite` notification row per recipient, also no dedupe.
3. `useNotifications`, `Notifications.tsx`, and `InviteAlertCard` all treat both types as valid invite alerts.

### Fix

**1. Database migration — single source of truth for invite alerts**

Replace `notify_on_event_invite()` with an upsert that consolidates by `(invited_profile_id, event_id)`:

- Look up an existing notification where `profile_id = NEW.invited_profile_id`, `type = 'rally_invite'`, `data->>'event_id' = NEW.event_id`.
- If none: insert ONE row with type `'rally_invite'`, title `"You're invited to {event_title}"`, body `"{Inviter Name} invited you. Tap to RSVP."`, `data` = `{ event_id, inviters: [invited_by], inviter_names: [name], responded: false }`.
- If exists AND `data->>'responded'` is not `'true'`:
  - Append `NEW.invited_by` to `data.inviters` (skip if already present).
  - Append inviter name to `data.inviter_names`.
  - Recompute `body`: 1 inviter → `"{name} invited you. Tap to RSVP."`; 2+ → `"{first_name} + {N} others invited you. Tap to RSVP."`.
  - Update `created_at = now()` (so it bumps to top), `read = false`.
- If exists AND `responded = true`: do nothing (don't re-fire).

Add an UPDATE trigger on `event_invites`: when `status` changes to `'accepted'` or `'declined'`, set the matching notification's `data.responded = true` and `read = true`.

**2. Backfill existing duplicates**

In the same migration, one-time SQL:

- For each `(profile_id, data->>'event_id')` group in `notifications` where type is in (`'rally_invite'`, `'event_invite'`): collect all distinct `invited_by` values from related `event_invites`, keep the row with the latest `created_at`, rewrite its type to `'rally_invite'`, rebuild title/body/`data.inviters`/`inviter_names`, then `DELETE` the rest.

**3. Edge function — stop double-inserting**

`supabase/functions/send-event-notification/index.ts`: when `type === 'rally_invite'`, skip the `notifications` table insert (the DB trigger now owns that) but keep all push notification delivery exactly as-is. Other types (`squad_invite`, `bar_hop_transition`, etc.) are untouched.

**4. Client — unify on `rally_invite`**

- `src/components/notifications/InviteAlertCard.tsx`: keep accepting both `rally_invite` and `event_invite` (for legacy rows that survived backfill, just in case), but render title/body straight from `notification.title` / `notification.body` (already set correctly by the trigger). No visual changes — same orange CTA, same calendar icon, same card.
- `src/pages/Notifications.tsx`: no changes needed — `INVITE_TYPES` already includes both. Icon mapping unchanged.
- `src/hooks/useNotifications.tsx`: toast branch for `event_invite` keeps working; add `rally_invite` to that same `else if` so re-bumped invites also toast.

### Out of scope (explicitly untouched)

- Invite delivery: `event_invites` insert, push delivery, email — unchanged.
- Other notification types (referrals, RSVPs, recap, friend requests, chat, Founder 25) — untouched.
- Dress Code and Song Rec's features — untouched.
- Card visual design — untouched.
- `EventCard`, `EventDetail`, `CreateEventDialog` — untouched.

### Acceptance test mapping

Steps 1–4 satisfied by the upsert trigger + UPDATE trigger. Step 5 satisfied by the backfill SQL. Step 6 verified by leaving all non-invite branches alone.
