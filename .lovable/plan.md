## Status of the three pre-flight checks

**1. Drunkies upload window — clear.**
The event row (`80e42cfb…DRUNKIES`) is still `status = 'scheduled'`. Storage RLS (`Event members can upload rally-media (24h post-event)`) allows uploads when status is `scheduled`, `live`, or `after_rally` — the 24h cutoff only kicks in once status flips to `completed`. The client-side `uploadWindow` guard in `EventPhotoFeed.tsx` also only blocks when `eventStatus === 'completed'`. **No event extension needed.** Kiree's only blocker is the 50-photo cap.

**2. Thumbnail RLS — already carved out.**
The earlier 403 was fixed by the migration that added two policies on `storage.objects`:
- `Event members can upload rally-media thumbnails` (INSERT)
- `Event members can update rally-media thumbnails` (UPDATE)
Both match `*_thumb.{jpg,jpeg,png,webp}` and require `is_event_member`. Recap thumbnails for Drunkies will write cleanly.

**3. Sticky progress UI — addressed below.**

## Plan (revised)

### A. Raise the cap
- `src/components/events/EventPhotoFeed.tsx`: `MAX_PHOTOS_PER_EVENT` from `50` → `500`. Update the over-limit toast copy.

### B. Parallel chunked uploads
- Replace the strictly sequential `for` loop in `handleUpload` with a chunked runner: process **4 files in parallel** via `Promise.allSettled`, then move to the next chunk. Maintains existing per-file validation and failure tallying.
- Track running counters in refs so a re-render mid-batch doesn't reset progress.

### C. Sticky progress overlay (new)
- While `uploading` is true, render a fixed-position pill at the bottom of the viewport (above the bottom nav, respecting `safe-area-inset-bottom`) using a Portal so it stays visible regardless of scroll position. Glass/Liquid styling per project core (`backdrop-blur-xl`, R@lly Orange accent).
- Content: `Uploading 137 of 348…` + thin progress bar (count-based) + small spinner. Auto-dismisses on completion; replaced by the existing summary toast.
- Z-index above `EventPhotoFeed` content but below modals (e.g. `z-50`).

### D. Failed-upload retry
- After the batch, keep the failed `File[]` in state and surface a small "Retry N failed" button at the top of the feed (mirrors the pattern in `RallyMediaUpload.tsx`). Same chunked runner.

### E. Out of scope
- No storage policy changes (already correct).
- No edits to `RallyMediaUpload.tsx` / `StagedMediaPicker.tsx` (pre-event staging, different flow).
- No DB schema changes.

## Files touched
- `src/components/events/EventPhotoFeed.tsx` — cap bump, chunked uploads, sticky portal progress, retry button.

## Verification
- Smoke test: select 60+ files in preview, confirm sticky progress stays visible while scrolling the feed and the count advances in chunks of 4.
- Confirm Recap thumbnails appear for any video Kiree includes (RLS already permits the backfill writes).
