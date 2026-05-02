## Plan: Video Posters + 24-Hour Final Cut Window

Four polish/infra changes. Items 1 and 4 are tiny verifications; items 2 and 3 are the real work.

---

### 1. Video poster fix (`EventPhotoFeed.tsx`)

The grid `<video>` already uses `#t=0.001` and `preload="metadata"`, but iOS still paints black until the metadata callback fires. The fix is to also expose `poster` so the browser has *something* to render immediately, and to force a frame seek on `loadedmetadata`.

- When a real `thumbnail_url` exists → keep the `<img>` path (already correct).
- When it's missing → render `<video poster={...} src="...#t=0.001" preload="metadata" muted playsInline />`. We use the same `#t=0.001` URL as the poster (browsers that respect it will show the seeked frame; others fall back to the video's own first frame once metadata loads).
- Add `onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.001; } catch {} }}` to nudge Safari into actually painting frame 0.

### 2. 24-Hour Final Cut Window — UI banner

The DB already enforces a 24h post-completion upload window (migration `20260429060542`). The UI just doesn't surface it.

- Add a small banner at the top of the Photos tab inside `EventPhotoFeed.tsx` that appears when `eventStatus === 'completed'` AND `now - eventUpdatedAt < 24h`.
- Banner text: **"Final Cut closes in 23h 14m"** with a live-updating countdown (re-render every 60s via `useEffect` + `setInterval`).
- After the 24h window: banner flips to a muted "Photo upload closed" state, and the existing upload buttons are hidden (already handled by RLS rejecting inserts; we also gate the buttons client-side for clean UX).
- Both `eventStatus` and `eventUpdatedAt` are already passed into `EventPhotoFeed` — no prop changes needed.

### 3. Auto-Archive cron — `after_rally` → `completed` after 24h

New migration:

- Helper function `public.auto_archive_stale_after_rallies()` (`SECURITY DEFINER`):
  ```sql
  UPDATE public.events
     SET status = 'completed', updated_at = now()
   WHERE status = 'after_rally'
     AND COALESCE(updated_at, start_time) < now() - interval '24 hours';
  ```
- `pg_cron` schedule `auto-archive-after-rally` running every 15 minutes, calling that function directly (no edge-function HTTP hop needed since it's pure SQL).
- The `update_event_status` trigger from migration `20260226044412` already allows `after_rally → completed`, so this transition is legal.

Side-effect: once flipped to `completed`, the existing safe-RPC mask (`get_event_safe`) becomes a no-op for stealth events (status is already `completed`), and the night naturally appears in everyone's Past R@llies feed.

### 4. Verify Parent R@lly photo visibility for Stealth After R@lly

This is already correct after the previous turn's "field-level gating" refactor — but worth an explicit audit:

- `rally_media` SELECT policy keys off `is_event_member(event_id)`, which checks the *parent* event attendee list — it has nothing to do with `after_rally_invited_ids`. So all original attendees can read parent R@lly media.
- `events` SELECT policy is back to `auth.uid() IS NOT NULL`, so the parent row is visible.
- `EventPhotoFeed` doesn't filter by stealth at all — it just lists `rally_media` for the event id.
- `downloadPhoto()` works on any media URL the client can fetch; storage RLS for SELECT is already permissive on `rally-media`.

No code change needed for #4 — but I'll add a one-line SQL test in the migration file as a comment showing the expected behavior, and update memory to lock this in.

---

### Technical change set

| File | Change |
|---|---|
| `src/components/events/EventPhotoFeed.tsx` | Add `poster` + `onLoadedMetadata` seek on the fallback `<video>`. Add Final Cut countdown banner at top of grid. Gate upload buttons when 24h window has expired. |
| `supabase/migrations/<new>.sql` | Create `auto_archive_stale_after_rallies()` SECURITY DEFINER function. Schedule `pg_cron` job `auto-archive-after-rally` every 15 minutes. |
| `mem://features/after-rally-stealth-mode` | Append: parent R@lly media stays visible to all original attendees regardless of stealth state; auto-archive flips stealth After R@llies to `completed` after 24h. |

No edge-function changes. No client refactor beyond `EventPhotoFeed.tsx`.

```text
                  ┌─────────────────────────────┐
  user opens tab  │  Final Cut closes in 23h 12m│  ← new banner
                  └─────────────────────────────┘
                  [ + Add photos ] [ + Add video ]   ← hidden after 24h
                  ┌────┬────┬────┬────┐
                  │ ▶  │ 📷 │ ▶  │ 📷 │   ← <video poster=...#t=0.001>
                  └────┴────┴────┴────┘      now paints first frame on iOS
```

