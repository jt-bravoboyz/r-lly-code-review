# Fix: Source Photos Distorted by Image Optimizer

## Root cause

`src/lib/imageOptimization.ts` rewrites Supabase storage URLs onto the on-the-fly render endpoint with `resize=cover` as the default. Callers like `RecapMediaTile` only pass `width: 600` (no height). Supabase's transformer then sets the new width to 600 but **keeps the original pixel height**, producing a horizontally squashed image.

Verified against this event's first photo:
- Source: `1206 × 1841` (natural portrait)
- Optimized (`?width=600&quality=75&resize=cover`): `600 × 1841` — distorted

That's why the recap grid still looks wrong even with `object-contain` and a square frame: the underlying JPEG itself is stretched.

## Fix

Edit `src/lib/imageOptimization.ts`:

1. Only attach `resize` when **both** `width` and `height` are provided. If only one dimension is set, omit `resize` so the transformer scales proportionally.
2. Keep current behavior for callers that explicitly pass both dimensions (e.g. featured hero crops).

That single change makes every recap tile fetch a proportionally-scaled 600px-wide JPEG (~600×916 for portraits, ~600×400 for landscapes), which then sits perfectly letterboxed inside the square `object-contain` tile.

## Verify

- Re-fetch the same URL with `?width=600&quality=75` (no resize) and confirm dimensions are proportional.
- Reload `/events/681e53e8-c8e5-43c0-a1cf-04861e4f2322` recap. Faces should look natural inside the Instagram square grid.

## Out of scope

- No layout, component, or RecapMediaTile changes — last turn's grid + `object-contain` is correct once the source is no longer distorted.
- No upload-side changes; originals in storage are fine.
