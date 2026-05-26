## Why it's slow

Both **Gallery** and **R@lly Recap** render `<img src={photo.url}>` pointing at the raw Storage object (`/storage/v1/object/public/rally-media/...`). Phone photos are 3–8 MB JPEGs, so a 4-tile grid is downloading 12–30 MB to paint 400px squares — the skeleton sits there until each full original finishes.

Supabase Storage exposes a built-in image transform endpoint (`/storage/v1/render/image/public/...?width=...&quality=...`) that returns a resized, re-encoded JPEG from the same bucket — no migration, no new infra, no new upload pipeline.

## Fix

1. **Add `src/lib/imageOptimization.ts`** — one tiny helper `getOptimizedImageUrl(url, { width, quality, resize })` that rewrites `/object/public/` → `/render/image/public/` and appends `width` + `quality=75` + `resize=cover`. Non-Supabase URLs pass through.

2. **Use the helper at every gallery / recap image site** (surgical, no logic changes):

   - `src/components/events/EventPhotoFeed.tsx`
     - tile photo (line ~506) → `width: 600`
     - tile video thumbnail (line ~477) → `width: 600`
     - full-screen viewer (line ~670) → `width: 1600, quality: 85`
   - `src/components/events/RallyHeroMediaCarousel.tsx`
     - hero carousel photo (line ~219) → `width: 1080`
     - video poster (line ~207) → `width: 1080`
     - edit-sheet 48×48 thumbs (line ~285) → `width: 96`
     - full-screen viewer (line ~382) → `width: 1600, quality: 85`
   - `src/components/events/RallyMediaSection.tsx` (line 50) → `width: 600`
   - `src/components/events/recap/RecapTour.tsx`
     - hero photo (line 226) → `width: 1080`
     - video poster (line 217) → `width: 1080`
   - `src/components/events/recap/RecapMediaTile.tsx`
     - photo (line 56) → `width: 600`
     - video thumbnail (line 44) → `width: 600`

3. **Add `decoding="async"` + `fetchPriority="low"`** to every gallery `<img>` so they don't compete with first paint. Hero/featured/viewer get `fetchPriority="high"`.

## Out of scope

- No DB or storage changes (bucket is already public).
- No edits to the upload pipeline — existing files benefit immediately.
- Video files unchanged (recap shows `<img>` thumbnails for them, which will also be transformed).
- No new dependencies.

## Expected impact

Typical gallery tile drops from ~5 MB → ~40 KB. The gray skeletons should resolve almost instantly on first paint.
