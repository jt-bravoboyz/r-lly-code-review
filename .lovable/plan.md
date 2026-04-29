## Three issues, one plan

### Issue 1 — Safety opt-in repeats

`src/pages/EventDetail.tsx` (line 247–267) re-opens `AfterRallyOptInDialog` whenever `myAttendee?.after_rally_opted_in !== true`. When a user picks **"I'm Heading Home"**, the column is set to `false` (not `true`), so the gate stays open and any React Query refetch (window focus, realtime invalidation, navigation back) re-fires `setShowAfterRallyOptIn(true)`. Same pattern affects `showRallyHomeDialog`.

### Issue 2 — Videos have no thumbnail on the Photos tab

`EventPhotoFeed` renders each grid tile as `<video preload="metadata">`. iOS Safari and many mobile Chrome builds do not decode a frame for inline display, so tiles show black or fall to the broken-state fallback. The `rally_media.thumbnail_url` column already exists but nothing populates or reads it.

### Issue 3 — Fullscreen photo/video viewer is cut off on iPhone

The viewer portal (`EventPhotoFeed.tsx` lines 460–585) uses `fixed inset-0` with no safe-area padding. The header (avatar, close, download, delete buttons) is clipped under the iPhone notch / status bar, and the dot indicators sit under the home indicator on devices with a bottom inset.

---

## Fix

### A. Stop the safety dialog from re-firing (`src/pages/EventDetail.tsx`)

1. Add `const afterRallyAskedRef = useRef(false);` and `const rallyHomeAskedRef = useRef(false);` seeded from `sessionStorage` keys `after_rally_asked_${id}` and `rally_home_asked_${id}`.
2. Tighten the opt-in effect (line 247): only auto-open when `after_rally_opted_in === null` (truly never answered) AND `not_participating_rally_home_confirmed !== true` AND `afterRallyAskedRef.current === false`. On open, set the ref + sessionStorage.
3. Same guard for `setShowRallyHomeDialog(true)` inside `handleHeadHomeFromAfterRally`.
4. Wrap the silent auto-opt-in update (lines 252–262) in a `autoOptInFiredRef` so it only fires once per mount per event.
5. Clear both guards when `after_rally_opted_in === true` (rejoin case).

Mirrors `mem://features/event-join-flow-stability`.

### B. Generate video thumbnails at upload time

1. **New helper `src/lib/videoThumbnail.ts`** — `extractVideoThumbnail(file: File): Promise<Blob | null>`:
   - Off-screen `<video muted playsInline preload='metadata'>`, src = `URL.createObjectURL(file)`.
   - On `loadeddata`, seek to `min(0.1, duration / 4)`, on `seeked` draw to a canvas at max-width 1280px, export as JPEG quality 0.78.
   - 6s timeout, try/catch, always resolves (`null` on failure).
2. **Update `useUploadRallyMedia` (`src/hooks/useRallyMedia.tsx`):**
   - For `type === 'video'`, call `extractVideoThumbnail(file)` first.
   - If a blob comes back, upload to `${eventId}/${uuid}_thumb.jpg` and pass the public URL into the row's `thumbnail_url`.
3. **Update `EventPhotoFeed.tsx` grid (lines 377–402):**
   - When `photo.thumbnail_url` exists, render an `<img src={photo.thumbnail_url}>` with the existing play-badge overlay.
   - Fallback to the current `<video>` element only when `thumbnail_url` is null.
4. **Opportunistic backfill for legacy videos:**
   - In `EventPhotoFeed`, a `useEffect` walks `photos.filter(p => p.type==='video' && !p.thumbnail_url && p.created_by === profile?.id)`, fetches the video bytes, runs the extractor, uploads, and updates the row. Only runs for the user's own uploads to avoid permission/spam issues.

`rally-media` storage policies already cover the `${eventId}/...` prefix (per `mem://security/storage-and-pii-policy-hardening`), so no migration needed.

### C. Safe-area padding for the fullscreen viewer (`EventPhotoFeed.tsx`)

1. Change the portal root (line 462) from `fixed inset-0 bg-black/95 z-[99999] flex flex-col` to also include `safe-top safe-bottom` (utilities defined globally per `mem://style/cross-platform-hardening`). On iPhone the inset pushes both the header bar and dot indicators into the visible area; on Android safe-area insets are 0 so the layout is unchanged.
2. Adjust the header bar (line 467) so the close / download / delete buttons remain finger-reachable: keep `p-4`, but increase tap targets are already 44px (no change).
3. Reduce the bottom dot-indicator's `pb-8` to `pb-4` so the combined `safe-bottom` + `pb-4` still hits the same total visual padding on devices without a bottom inset (≈1.5rem fallback in the safe utility) and avoids a large gap on iPhone.
4. The `<video controls>` element keeps `max-w-full max-h-full` inside the flex container, which now respects the inset, so playback controls are no longer obscured by iOS Safari's bottom URL bar overlap.

### Verification

- After R@lly: choose "I'm Heading Home" → R@lly Home flow runs → navigate away and back → no re-prompt.
- Window blur/focus mid-event → no re-prompt.
- Upload a `.mov` from iPhone Safari → grid tile shows still frame within ~1s, plays in viewer.
- Upload `.mp4` from Android → same.
- Open the fullscreen viewer on iPhone → close button and uploader avatar visible below the notch; dot indicators visible above the home indicator. Open same viewer on Android — identical look (no extra padding).
- Legacy videos: on next visit by the uploader, thumbnail backfills silently and propagates to all viewers.

## Files changed

- `src/pages/EventDetail.tsx`
- `src/lib/videoThumbnail.ts` (new)
- `src/hooks/useRallyMedia.tsx`
- `src/components/events/EventPhotoFeed.tsx`
- Memory: append a note to `mem://features/safety-opt-in-and-end-flow` about per-session `askedRef` guards, and add a small entry to `mem://features/rally-media-system` about client-extracted thumbnails + safe-area viewer.

No DB migrations required.
