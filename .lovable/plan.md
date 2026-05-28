# Fix RecapTour Zoom/Crop — Keep Square Grid

## Scope
Single file: `src/components/events/recap/RecapTour.tsx`. Pure styling fix — no layout restructure, no data changes.

## Changes

### 1. Gallery step (`currentStep === 'gallery'`)
- Keep the existing `grid grid-cols-3 gap-2` layout exactly as-is.
- Pass `focalClass="object-[center_25%]"` to `RecapMediaTile` so the square crop anchors on the upper third where faces sit, instead of dead-center.
  - (`RecapMediaTile` already supports `focalClass` from the previous fix.)

### 2. Hero Video step (`currentStep === 'heroVideo'`)
- Change the `<video>` className: `aspect-[4/5] object-cover` → `aspect-[3/4] object-cover object-[center_30%]`.

### 3. Best Photo Spotlight step (`currentStep === 'bestPhoto'`)
- Same change on both branches (video + img): `aspect-[4/5] object-cover` → `aspect-[3/4] object-cover object-[center_30%]`.

All gradient overlays, primary rings, badges, and animations stay untouched.

## Verification
Open `/events/681e53e8-c8e5-43c0-a1cf-04861e4f2322`, let the recap tour play through:
- Gallery grid: faces no longer chopped off in square tiles.
- Hero Video + Shot of the Night: more of the original frame visible, no aggressive top/bottom crop.
