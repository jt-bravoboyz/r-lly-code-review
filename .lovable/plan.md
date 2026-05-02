Plan: Fix Mobile Video Thumbnails for Good

The screenshots and current network data show the videos still have `thumbnail_url: null`, and the derived `_thumb.jpg` fallback URLs return storage errors. That means the current UI fallback has no real image to paint on the phone, so iOS keeps showing the pale blank video tile with only the play icon.

1. Make EventPhotoFeed use a real poster source first
- Add a shared `getVideoPosterUrl(media)` helper in `EventPhotoFeed.tsx`.
- Prefer `media.thumbnail_url` when present.
- Fall back to the expected sibling `_thumb.jpg` URL only when `thumbnail_url` is missing.
- Use that URL as an `<img>` tile before trying the `<video>` element, so mobile Safari does not need to decode video metadata just to display the grid.
- Keep the play badge overlay and viewer behavior unchanged.

2. Fix the current fallback bug in EventPhotoFeed
- The existing derived thumbnail logic uses the video file basename (`.../video_uuid_thumb.jpg`).
- The browser backfill code currently uploads using the database media id (`.../media_id_thumb.jpg`).
- I will align this so any newly generated fallback thumbnail is stored at the same basename-derived path the UI expects, and also writes that URL into `rally_media.thumbnail_url`.

3. Add a backend thumbnail guarantee for legacy videos
- Update the existing `transcode-video` backend function so when it processes or checks a video it also ensures a `thumbnail_url` exists.
- Because the backend cannot decode video frames without ffmpeg, it will attempt the existing sibling `_thumb.jpg` storage path first and write it into the database if the file exists.
- This makes already-uploaded thumbnails discoverable by the UI instead of relying on mobile video metadata.

4. Backfill rows that already have thumbnails in storage but null database fields
- Add a safe migration/function pass that updates `rally_media.thumbnail_url` for video rows where the matching `_thumb.jpg` object already exists.
- This will not invent thumbnails for videos where no thumb object exists; it only connects existing image files to the database.

5. Add a final UI fallback only when no image exists
- If both `thumbnail_url` and sibling `_thumb.jpg` fail to load, keep the current neutral video tile with the play icon.
- Avoid marking the video as broken just because the poster image failed; opening the video should still work.

6. Verify on the reported event
- Confirm the gallery query for event `681e53e8-c8e5-43c0-a1cf-04861e4f2322` returns video rows with thumbnail URLs where available.
- Confirm `EventPhotoFeed.tsx` no longer depends on iOS `loadedmetadata`/`readyState` for the normal grid paint path.
- Confirm full-screen playback still uses the original video URL.