## Fix: Videos must play on both iPhone AND Android

### What's actually happening

In the database for **Joey's Backyard Bash**:
- Storage bucket is **public** ✓
- Storage RLS allows **all event members to read AND upload** rally media ✓
- The video that was uploaded is a **`.mov` (QuickTime)** file from an iPhone

**Root cause:** `.mov` plays fine on Apple devices but Android Chrome silently fails to render it in a `<video>` tag — even though the file downloads. That's why Taniya (or anyone on Android) can't see the video Joey uploaded.

iPhones record H.264 video inside a `.mov` container. The codec is universal; only the container is the problem.

### Plan — make videos work on iPhone AND Android

**1. Server-side transcode `.mov` → `.mp4` on upload (Edge Function with ffmpeg)**

Create a new edge function `transcode-video` that:
- Accepts the uploaded file path in the `rally-media` bucket
- Downloads the file from storage
- Uses ffmpeg WASM to **rewrap** (`-c copy`) the H.264 stream from `.mov` into `.mp4` — no re-encoding, ~5-15 sec for a typical phone clip, no quality loss
- Uploads the `.mp4` back to storage at the same path with `.mp4` extension
- Updates the `rally_media` row's `url` and deletes the original `.mov`

Upload flow in `src/hooks/useRallyMedia.tsx` becomes:
1. Upload file to storage as today
2. Insert `rally_media` row with `type: 'video'`, `url: <original mov url>`, plus a new `processing: true` flag
3. Fire-and-forget call to `transcode-video` edge function
4. Edge function swaps the URL to `.mp4` when done; realtime subscription auto-refreshes the gallery

**2. Add `processing` state to the gallery UI**

In `src/components/events/EventPhotoFeed.tsx`:
- If `processing === true`, show a "Processing… (playable in ~30s)" placeholder on the tile instead of the broken `<video>`
- Realtime subscription already invalidates the query, so once the URL updates, the tile becomes a real video

**3. Add a graceful fallback for the existing broken `.mov` already in the DB**

For the one video already uploaded (Joey's `f9924377-...mov`):
- Trigger a one-time backfill of the `transcode-video` function for any existing `.mov` rows
- Until backfill completes, the tile shows "Tap to download" with a direct link to the public URL (works on every device)

**4. Migration: add `processing` column**

Add `processing boolean default false` to `rally_media` so the UI knows when to show the placeholder.

**5. Confirm everyone can already upload**

Already verified — the RLS policy `Event members can upload rally media` covers any attendee (not just hosts). Taniya, Joey, and all Backyard Bash attendees can upload videos right now. No DB changes needed for permissions.

### Files & changes

- **New:** `supabase/functions/transcode-video/index.ts` — ffmpeg-based remux `.mov` → `.mp4`
- **Migration:** add `processing` column to `rally_media`
- **Edit:** `src/hooks/useRallyMedia.tsx` — invoke transcode after upload, set `processing: true` for `.mov`
- **Edit:** `src/components/events/EventPhotoFeed.tsx` — render `processing` placeholder + `onError` fallback with "Tap to download" link
- **One-time:** Backfill — re-trigger transcode for existing `.mov` rows so Joey's video becomes playable for Taniya

### Trade-offs to know
- ffmpeg WASM in an edge function adds ~30MB cold-start. First transcode will be a few seconds slower than subsequent ones.
- Remuxing (not re-encoding) keeps quality 1:1 and runs fast — typically 5-15 sec for a 1-minute clip.
- `.webm` and `.mp4` uploads skip transcoding entirely and appear instantly.