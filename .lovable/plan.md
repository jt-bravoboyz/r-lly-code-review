## The "Past R@lly" & Video Polish Plan

Four polish items. Item 4 is the most important — there is a real bug in the Stealth gate that's hiding the parent R@lly from non-invited attendees.

---

### 1. Past R@lly downloads (photos + videos)

`EventPhotoFeed.tsx` already shows a Download button in the fullscreen viewer for **photos**, and it works for completed events. Two gaps to close:

- **Video downloads**: the viewer hides the Download button when the item is a video (`type !== 'video'` check). Remove that gate so videos can be saved too. `downloadPhoto()` in `src/lib/downloadMedia.ts` already builds the filename from the URL extension and works for any blob — only minor: rename the toast copy to "Saved!" and use the existing native share-sheet path on iOS/Android (it already routes to "Save Video" on native).
- **Visibility on completed events**: confirmed already shown — no change needed beyond removing the video gate.

### 2. Video cover photos in the grid

`EventPhotoFeed.tsx` already prefers `thumbnail_url` and falls back to a `<video>` tag. Add the missing `#t=0.001` trick and a poster-friendly setup so the fallback `<video>` actually paints a frame instead of a black box on iOS Safari and Android Chrome:

- When `thumbnail_url` is missing, render `<video src={`${photo.url}#t=0.001`} preload="metadata" muted playsInline />` (the `#t` fragment forces the browser to seek to the first frame so it shows a still).
- Keep the existing opportunistic backfill that uploads a real `_thumb.jpg` for the user's own legacy videos.
- Keep the play-button overlay on top.

### 3. End the "R@lly Announcement Party"

The event `R@lly Announcement Party` (id `681e53e8…`) is currently `status='after_rally'` with stealth on. Use a small data update (via the data tool, not a migration) to flip it to `completed` so it drops out of Live Now and lands in Past R@llies. The existing `usePastEvents` hook will pick it up; the `useEvents` Live/Upcoming feed already filters out `completed`.

### 4. Stealth gate audit — bug found, fix the parent visibility

Right now the RLS we shipped reads:

```text
status <> 'after_rally'  OR  is_after_rally_invited(event, viewer)
```

That phrasing **hides the entire events row** (parent R@lly metadata, photos, attendees) from anyone not on the stealth list while the event is in the After R@lly phase. That's wrong — the original R@lly is a public, completed-feeling thing for the original crew; only the new After R@lly chapter (location, opt-in, transition theme, recipient list) should be private.

**The fix is to stop using the events row itself as the gate, and only gate the After R@lly *fields* and the After R@lly *experience*:**

- **RLS rollback**: restore the simple `auth.uid() IS NOT NULL` SELECT policy on `events` so non-invited attendees can still read their parent R@lly row, photos, recap, etc.
- **Field gating via a security-definer view / RPC** (`get_event_safe`): when the caller is not invited and the event is in stealth After R@lly, blank out the After R@lly–only columns (`after_rally_location_name`, `after_rally_location_lat`, `after_rally_location_lng`, `after_rally_invited_ids`, and downgrade `status` from `'after_rally'` → `'completed'`). Update `useEvent` / `useEvents` to read through this view.
- **Edge function** (`send-event-notification`): the stealth recipient gate we shipped last turn already restricts notifications to the invited crew — keep it.
- **Client gating in `EventDetail.tsx`**: existing `isStealthExcluded` logic already maps the night to "Completed" for non-invited. Now that the row is visible again, those non-invited users see the recap/photos as expected and never see After R@lly UI.
- **Live Now feed**: the `useEvents` defense-in-depth filter we added now becomes a soft filter — keep it; for stealth After R@lly the parent row will read as `completed` (downgraded by the view) so it'll naturally drop from Live Now via the existing `.not('status','eq','completed')` clause.

Net result for non-invited:
- Sees the parent R@lly in their Past R@llies feed.
- Can still browse the photo feed and recap.
- Sees no After R@lly banner, no location, no theme transition, no opt-in, no notifications about it.

For invited / host / cohosts: full After R@lly experience as today.

---

### Technical change set

| File | Change |
|---|---|
| `supabase/migrations/…` | New migration: drop the stealth-aware events SELECT policy, restore the `auth.uid() IS NOT NULL` policy. Create `public.get_event_safe(p_event_id uuid)` and `public.list_events_safe()` SECURITY DEFINER functions that return events with After R@lly columns nulled + status downgraded for non-invited viewers. |
| `src/hooks/useEvents.tsx` | Switch `useEvent` and `useEvents` to call the new safe RPCs (or add a client-side projection that mirrors the view logic, depending on join needs). Keep the defense-in-depth filter as a no-op fallback. |
| `src/components/events/EventPhotoFeed.tsx` | Remove the `type !== 'video'` gate around the viewer Download button. In the grid fallback `<video>`, append `#t=0.001` to the src and ensure `preload="metadata"`. Toast copy: "Saved!" |
| Data update (no migration) | `UPDATE events SET status='completed' WHERE id='681e53e8-c8e5-43c0-a1cf-04861e4f2322'` |
| `mem://features/after-rally-stealth-mode` | Update memory: stealth gates **fields**, not the row. Parent R@lly stays visible to original attendees. |

No edge function redeploy needed for items 1–3. Item 4 requires the migration + a small client refactor to read through the safe RPC.
