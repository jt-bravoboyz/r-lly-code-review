# Fix Recap Photo Bin "Weird Zoom"

## Problem
Every tile in the Recap Photo Bundle is locked to `aspect-square` + `object-cover`. Portrait phone photos (the majority of R@lly content) get aggressively center-cropped, chopping off heads and making shots look zoomed-in. The hero (`aspect-[4/5]`) has the same issue for landscape shots.

## Fix — Two-part: quick win now, premium polish next

### Part 1 — Face-aware crop (instant win)
File: `src/components/events/recap/RecapMediaTile.tsx`

- Add a new `focal` prop (defaults to `'top'`) on `RecapMediaTile`.
- When `square` is true, apply `object-[center_25%]` (Tailwind arbitrary `object-position`) instead of default center. This preserves faces (which sit in the upper third of selfies/group shots) when the square crop chops the bottom.
- For videos with thumbnails, apply the same focal positioning to the `<img>`.

File: `src/components/events/recap/RecapTimeline.tsx`

- Hero section: change `aspect-[4/5]` → `aspect-[3/4]` and add `object-[center_30%]` so landscape "Shot of the Night" photos stop getting their tops/bottoms shaved.
- Keep the orange ring + gradient overlay exactly as-is.

### Part 2 — Premium masonry grid (the Apple-Memories feel)
File: `src/components/events/recap/RecapTimeline.tsx` (Photo Bundle section only)

Replace the rigid `grid grid-cols-3` square grid with a CSS columns masonry:

```text
columns-3 gap-2 space-y-2
  └─ each tile: break-inside-avoid, rounded-xl, natural aspect
```

- Render `RecapMediaTile` with `square={false}` inside the masonry so each photo keeps its natural ratio (`object-contain` is NOT used — we let the `<img>` define its own height via `w-full h-auto`).
- Update `RecapMediaTile` to support `square={false}` properly: drop the forced container height, render `<img className="w-full h-auto block">`, and for videos render the thumbnail with the same natural sizing + the play badge overlay re-anchored to `inset-0`.
- "View All" button logic stays the same (`galleryPhotos.length > 7`).

### Why this combo
- Part 1 ships a one-line visual fix that immediately stops the "zoomed-in face cut off" complaint across every recap.
- Part 2 transforms the bin from a uniform grid into a content-respecting collage — premium, on-brand for the 2026 Glass/Liquid system, and the standard pattern for memory recaps (Apple Memories, IG Year-in-Review).

## Out of scope
- No data layer / query changes.
- No changes to upload flow, video transcoding, or thumbnail backfill.
- Empty-state card, Rogue Timeline, Squad Stars, and Closer sections untouched.

## Verification
- Open `/events/681e53e8-c8e5-43c0-a1cf-04861e4f2322` recap and confirm portrait photos render full-height in the bin with no face-cropping.
- Confirm hero shot shows more of the original frame.
- Confirm video tiles still show the play badge centered.
