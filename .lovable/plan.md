# Rogue Engagement Fix + 24h Post-Event Media + Video-First Recap

Three coordinated fixes so the night actually keeps going after the last call: rogue alerts that everyone sees and reacts to, attendees still uploading photos/videos for 24 hours after a R@lly ends, and the Recap treating videos as hero content with a live-refreshing "movie of the night."

---

## 1. Rogue Alert — make sure people actually see and react to it

### Problem
`useRogueAlerts` only shows the `RogueAlertOverlay` to users whose browser receives the **realtime INSERT** at that exact moment. Anyone who opens the event page later (or was in another tab/closed the app) never sees the popup, so the reaction bar gets zero engagement. The push notification fires, but tapping it just dumps you on the event with no overlay.

### Fix

1. **Persistent "unseen rogues" queue (client)**
   - In `useRogueAlerts.tsx`, add a `seenRogueIds` set persisted to `localStorage` keyed `rogue_seen_${eventId}`.
   - On mount, after the initial `alerts` query resolves, find any alert created in the **last 30 minutes** that isn't in `seenRogueIds` and isn't the current user's own — push it into a `pendingAlerts` queue.
   - Render the overlay for queued alerts one at a time; on dismiss, mark seen and pop the next.
   - Keep the realtime INSERT path; just route new inserts into the same queue.

2. **Notification deep-link opens the overlay**
   - When the rogue push notification is created (`send-event-notification` `rogue_alert` type), include `data.rogue_alert_id` in the payload (already partial — make it explicit).
   - On `EventDetail` mount, read `?rogue=<id>` from the URL (or notification data) and force that alert to the front of the queue, bypassing "seen" state.

3. **Reactions visible everywhere — not just in the popup**
   - In `RecapTimeline.tsx` (and the live event timeline if shown), every rogue card already lists `reactionCounts`. Add tap-to-react inline using the same `submitReaction` mutation, so even users who missed the overlay can still hit 🤮 / 😍 / 🍆.
   - This means "two people went rogue + nobody reacted" becomes "two people went rogue + 8 reactions trickled in over the next hour" — exactly the engagement loop you want.

4. **Auto-poll when a rogue is uncontested ("Where they going?")**
   - Add a small `EventAlert` row in the live event view: if a rogue alert is >5 minutes old and has zero reactions, render a one-tap poll card: **"Where they going? 🤔 Bar / Home / Unknown"** wired to a lightweight `rogue_polls` table (3 buttons → counts).
   - This is opt-in friction; even one tap counts as a reaction and spawns engagement.
   - Schema: `rogue_polls(rogue_alert_id, profile_id, choice)` with unique `(rogue_alert_id, profile_id)`. RLS: event members read/write their own row.

### Files

- `src/hooks/useRogueAlerts.tsx` — add `pendingAlerts` queue + `seenRogueIds` localStorage + URL-param hydration.
- `src/components/events/RogueAlertOverlay.tsx` — accept a `queuePosition` ("1 of 2") for visual hint when multiple are stacked.
- `src/components/events/recap/RecapTimeline.tsx` — make the rogue cards tap-to-react.
- **New** `src/components/events/RogueAuto Poll.tsx` — the "Where they going?" one-tap card.
- `src/pages/EventDetail.tsx` — render the auto-poll for stale-uncontested rogues; consume `?rogue=` URL param.
- **New migration** — `rogue_polls` table + RLS + add it to realtime.
- `supabase/functions/send-event-notification/index.ts` — ensure `rogue_alert_id` is in notification `data`.

---

## 2. 24-Hour Post-Event Photo/Video Bundle

### Current state
RLS on `rally_media` already allows **any event attendee** to insert (good). The Photos tab (`EventPhotoFeed`) is mounted regardless of event status (also good). The blocker is purely UX: nothing tells users they have a 24h window after a R@lly ends, and the Recap doesn't refresh when late drops arrive.

### Fix

1. **24h "After-Party Upload" CTA**
   - In `EventPhotoFeed.tsx`, when `event.status === 'completed'` and the event ended <24h ago, render a sticky banner above the feed:
     > 🎬 **The night's not over.** Upload your shots & clips for the final cut — 22h 14m left.
   - Countdown derived from `event.completed_at` (or the most recent `events.updated_at` where status flipped) + 24h.
   - After 24h, hide the upload button entirely on the photo feed and show: **"Bundle locked."**

2. **RLS hardening for the 24h window**
   - Tighten the existing `INSERT` policy on `rally_media` so uploads only succeed while the event is live OR within 24h of completion:
     ```sql
     WITH CHECK (
       is_event_member(event_id)
       AND created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
       AND EXISTS (
         SELECT 1 FROM events e
         WHERE e.id = event_id
         AND (
           e.status IN ('scheduled','live','after_rally')
           OR (e.status = 'completed' AND e.updated_at > now() - interval '24 hours')
         )
       )
     )
     ```
   - Same condition added to storage `rally-media` bucket INSERT policy.

3. **Recap auto-refresh on new media**
   - In `useRecapData` (and `useRallyMedia`), subscribe to realtime INSERTs on `rally_media` filtered by `event_id`. On INSERT, invalidate `['rally-media', 'rally-media-gallery', 'rally-media-featured']` queries.
   - Result: new clips dropped at 3am show up live in the Recap timeline of anyone with it open.

### Files

- `src/components/events/EventPhotoFeed.tsx` — countdown banner + locked state.
- `src/hooks/useRallyMedia.tsx` — realtime subscription on `rally_media` per-event.
- **New migration** — tighten `rally_media` INSERT policy + storage bucket INSERT policy with the 24h window.

---

## 3. Video as Hero Content in the Recap

### Current state
`RecapTour` and `RecapTimeline` always render `<img src={photo.url}>` even when `photo.type === 'video'`, so videos display as a broken image or a black box. Videos already have `thumbnail_url` extracted at upload time (`useRallyMedia` does `extractVideoThumbnail` → `_thumb.jpg`).

### Fix

1. **Hero video step in the Tour**
   - Add a new tour step `'heroVideo'` between `'gallery'` and `'bestPhoto'`, only inserted into `steps` if `galleryPhotos.some(m => m.type === 'video')`.
   - Pick the **most-reacted / earliest** video (or just the first video chronologically as a v1).
   - Render an autoplaying, muted, looping `<video>` with `playsInline`, framed in the same 4/5 aspect ring as the Best Photo step. Overlay caption: **"🎞️ Final Frame — The reel of the year just dropped."**
   - Tap-to-advance preserved.

2. **Video-aware media tile component**
   - Create `RecapMediaTile` used by both `RecapTour` and `RecapTimeline`:
     - If `type === 'video'` and `thumbnail_url` exists → render the thumbnail with a small ▶︎ glyph in the corner.
     - If `type === 'video'` and no thumbnail → render the video poster frame.
     - If `type === 'photo'` → render the image as today.
   - Use this in the gallery grid in `RecapTour` and the photo grid in `RecapTimeline` so videos are clearly distinguishable.

3. **Hero treatment in Best Photo step**
   - If the best item happens to be a video, render the video instead of an image, otherwise fall through to the existing image path.

4. **New rotating Recap closers** (already on your roadmap — folding it in here so the finale matches the new energy)
   - Add 4 more closers to whatever closer rotation we use:
     - **Vibe Shift Completed.** — *We set the new standard.* — 🌊
     - **Receipts Filed.** — *Legends only, no skips.* — 🧾
     - **Signal Lost.** — *Into the archives we go.* — 📡
     - **Final Frame.** — *The reel of the year just dropped.* — 🎞️
     - **Touchdown Confirmed.** — *Home and highly favored.* — 🏁

### Files

- **New** `src/components/events/recap/RecapMediaTile.tsx` — the photo/video-aware tile.
- `src/components/events/recap/RecapTour.tsx` — insert `'heroVideo'` step, swap gallery grid + best item to use `RecapMediaTile`.
- `src/components/events/recap/RecapTimeline.tsx` — swap gallery grid to `RecapMediaTile`; share text mentions video count when present.
- `src/hooks/useRecapData.tsx` — expose `videoCount` and a `heroVideo` (first video) selector.

---

## Out of scope

- Re-architecting the rogue notification flow into native push-with-actions (would need APNs/FCM action buttons — bigger lift).
- AI-generated highlight reel from the videos.
- Touching `/rides` (dead) or `cancelled` events.

## Migration summary

Two new migrations:

1. **`rogue_polls`** table + RLS + realtime (3 columns + unique constraint).
2. Tighten `rally_media` and storage `rally-media` INSERT policies to enforce the 24h post-event upload window.

No edits to `src/integrations/supabase/{client,types}.ts`. No changes to `supabase/config.toml` project-level keys.

## Files touched

- `src/hooks/useRogueAlerts.tsx`
- `src/hooks/useRecapData.tsx`
- `src/hooks/useRallyMedia.tsx`
- `src/components/events/RogueAlertOverlay.tsx`
- `src/components/events/EventPhotoFeed.tsx`
- `src/components/events/recap/RecapTour.tsx`
- `src/components/events/recap/RecapTimeline.tsx`
- `src/pages/EventDetail.tsx`
- **New** `src/components/events/RogueAutoPoll.tsx`
- **New** `src/components/events/recap/RecapMediaTile.tsx`
- `supabase/functions/send-event-notification/index.ts`
- 2 new SQL migrations
