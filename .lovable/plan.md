# Photo Bundle → Instagram-style Uniform Square Grid

Goal: every recap photo sits in a perfect square cell, full image visible (letterboxed), no cropping of faces.

## Changes

### 1. `src/components/events/recap/RecapTimeline.tsx`
- Remove any dynamic/masonry/columns logic in the photo bundle section.
- Force grid wrapper to: `grid grid-cols-3 gap-2`.

### 2. `src/components/events/recap/RecapTour.tsx`
- In the `gallery` step, remove any masonry/columns logic.
- Force grid wrapper to: `grid grid-cols-3 gap-2`.
- Remove any leftover `focalClass` props passed to `RecapMediaTile`.

### 3. `src/components/events/recap/RecapMediaTile.tsx`
- Square mode container: `aspect-square w-full rounded-xl overflow-hidden relative bg-zinc-900/40 backdrop-blur-sm`.
- Inner `<img>` (and video poster/thumbnail img): `object-contain w-full h-full` — no `object-cover`, no focal offsets.
- Keep the existing blurred backdrop layer behind the contained image so portrait letterbox bars feel themed (still using `object-cover` on that background-only layer is fine since it's purely decorative).
- Keep video play badge, selection ring, and overlays untouched.

## Out of scope
- Hero video and Best Photo Spotlight steps in `RecapTour.tsx` stay as-is (already `aspect-[3/4] object-contain` from prior fix).
- No business logic, data, or animation changes.

## Verify
- Open `/events/681e53e8-c8e5-43c0-a1cf-04861e4f2322` recap → Photo Bundle and Tour gallery step both render an even 3-col square grid with full vertical photos visible inside each tile.
