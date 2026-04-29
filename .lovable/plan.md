# Add Video Upload to R@lly Photo Section

## Context

The R@lly media system already supports videos at the schema/storage layer:
- `rally_media.type` accepts `'photo' | 'video'`
- The `rally-media` storage bucket is public with no MIME restriction
- `useUploadRallyMedia` already accepts `type: 'video'`
- Hero carousel already renders videos (featured)

The only gap: the **gallery feed inside an event** (`EventPhotoFeed.tsx`) is hard-coded to images only — `useGalleryPhotos` filters `type='photo'`, the file picker accepts only image MIMEs, and the grid/viewer use `<img>` exclusively.

**New caps per event (raised from prior 10+1 rule):**
- **50 photos**
- **5 videos**
- **500MB per video** (unchanged)
- **10MB per photo** (unchanged)

Caps are enforced client-side, consistent with the existing photo-cap pattern.

## Changes

### 1. `src/hooks/useRallyMedia.tsx`
- Repurpose `useGalleryPhotos` → return **all non-featured media** (photos + videos). Remove the `.eq('type', 'photo')` filter.
- Sort by `created_at desc` so newest leads.

### 2. `src/components/events/EventPhotoFeed.tsx`

**File picker `accept`** (both `<input>` instances):
`image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm`

**Constants at top of file:**
```ts
const MAX_PHOTOS_PER_EVENT = 50;
const MAX_VIDEOS_PER_EVENT = 5;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;  // 500MB
```

**Upload handler `handleUpload` — enforce both caps:**
- Compute `existingPhotos = photos.filter(p => p.type === 'photo').length` and `existingVideos = photos.filter(p => p.type === 'video').length`.
- Walk selected files in order, tracking `photosQueued` and `videosQueued`.
- For each file:
  - Detect type via `file.type.startsWith('video/')`.
  - **Video path**: if `existingVideos + videosQueued >= 5` → toast `"Max 5 videos per R@lly. Delete one to add more."` and skip. Else size-check (500MB), increment `videosQueued`, upload with `type: 'video'`.
  - **Photo path**: if `existingPhotos + photosQueued >= 50` → toast `"Max 50 photos per R@lly. Delete one to add more."` and skip. Else size-check (10MB), increment `photosQueued`, upload with `type: 'photo'`.
- Type-aware success toast: `"Video added 🎥"` / `"3 photos added 📸"` / mixed `"5 added"`.

**Grid tile**: if item is a video, render `<video src={url} muted playsInline preload="metadata" />` plus a small play-icon overlay badge. Keep aspect-square crop.

**Fullscreen viewer**: if current item is a video, render `<video controls autoPlay playsInline className="max-w-full max-h-full">` instead of `<img>`. Download/delete controls remain.

**Empty state CTA**: "Add Photo" → "Add Photo or Video".

**Batch select**: photos only — clicking a video tile in select mode falls through to opening the viewer. Bulk save of videos is out of scope.

### 3. No DB / storage / RLS changes
Schema and bucket already support videos. Both caps enforced client-side, same pattern as the existing photo cap.

### 4. Update memory
After ship, update `mem://features/rally-media-system` to reflect new caps (50 photos + 5 videos, 500MB/video).

## Out of Scope
- Server-side cap enforcement (matches existing pattern).
- Video thumbnail generation, compression, or transcoding.
- Bulk camera-roll save of videos.

## Files Touched
- `src/hooks/useRallyMedia.tsx` (drop photo-only filter on gallery query)
- `src/components/events/EventPhotoFeed.tsx` (mime accept, dual cap guard, video tile, video viewer, copy)
