## Goal

When the event page opens and the hero carousel slide is a video, it should **autoplay, loop, and stay muted** with **no play-button overlay** — just the video running silently behind the carousel UI. Photos and the fullscreen viewer behavior stay unchanged.

## Where it lives

`src/components/events/RallyHeroMediaCarousel.tsx` — the video branch inside `CarouselItem` (currently lines ~155–168). That branch renders a `<video>` with `preload="metadata"` only, then layers a dark scrim plus a circular Play button on top.

## Changes

1. **Make the hero video auto-play on loop, silent, inline.**
   - Add `autoPlay`, `loop`, and keep `muted playsInline`.
   - Add `preload="auto"` so the first frame paints immediately instead of staying black.
   - Add `poster={item.thumbnail_url || undefined}` if available on the media row, so the first paint is never blank on slow networks (safe fallback to undefined if the field isn't present).

2. **Remove the Play button overlay and dark scrim** from the carousel slide. The video itself is now the visual.
   - Drop the `<div className="absolute inset-0 ... bg-black/20">…<Play /></div>` block from the video branch.
   - Tap on the slide still opens the fullscreen viewer (existing `onClick={() => openViewer(...)}` on `CarouselItem` is unchanged), and the fullscreen viewer keeps its native `controls` for playback control.

3. **Pause/resume on visibility (small polish).**
   - Add a `ref` on the inline hero `<video>` and a small effect that calls `pause()` when `document.hidden` and `play().catch(() => {})` when visible again. Prevents the video from continuing to decode in the background and recovers cleanly when the user returns to the tab.

4. **Leave the edit sheet's tiny preview thumbnail alone** (the Play icon there is correct UX for a manage list).

## Out of scope

- Recap "Hero Video" step — already autoplays/loops; not touched.
- Upload, ordering, or storage logic.
- Audio: hero stays muted (browsers block autoplay with sound; muted is required).

## Technical notes

- The `<video>` attribute set required for reliable mobile autoplay across iOS Safari / Android Chrome / PWA: `autoPlay muted loop playsInline preload="auto"`. All four are needed; missing `playsInline` causes iOS to force fullscreen, missing `muted` blocks autoplay entirely.
- Keep `object-cover` and the existing `aspect-[16/9]` wrapper — no layout change.
- Pagination dots, index indicator, and edit button overlays remain on top of the video (they're siblings, not children of the slide).
