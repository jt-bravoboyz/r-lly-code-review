## Why hero video isn't autoplaying on your phone

The current `<video>` already has `muted autoPlay playsInline preload="auto"`, which is the textbook setup. On iOS Safari / iOS PWA, autoplay still fails in three real-world cases:

1. **React's `muted` prop alone isn't reliable for autoplay on Safari.** The `muted` attribute must exist on the DOM element *before* `play()` is called. React sometimes flushes the property after the autoplay attempt, and Safari then blocks it.
2. **Carousel re-renders** can re-mount the `<video>`, and the auto-play attempt happens before metadata loads. If the first `play()` rejects, nothing retries.
3. **Low Power Mode** on iPhone blocks autoplay categorically. Nothing in code can override this — but we can recover the moment the user touches anywhere on the page.

## Fix

Single file: `src/components/events/RallyHeroMediaCarousel.tsx`, hero video branch (lines 169–183).

**Inside the `ref` callback**, when the element mounts:
- Imperatively set `el.muted = true`, `el.defaultMuted = true`, and `el.setAttribute('muted', '')` so Safari sees the muted state synchronously before any play attempt.
- Add `webkit-playsinline` and `playsinline` attributes (older iOS still checks the lowercase/vendor form).
- Call `el.play().catch(() => {})` immediately, then again on `loadedmetadata` and `canplay` (one-shot listeners). This covers the race where the first attempt fires before the source is ready.

**On the JSX**, add `controls={false}` and `disablePictureInPicture` so iOS doesn't surface its own UI overlay on the slide.

**Add a one-time global gesture recovery** at component mount (effect that runs once): on the first `touchstart`/`pointerdown` anywhere in the document, walk every entry in `heroVideoRefs.current` and call `play().catch(() => {})`, then remove the listener. This is the standard escape hatch for Low Power Mode and aggressive autoplay policies — the moment the user touches the screen, the video kicks in.

Existing visibility pause/resume logic stays.

## Out of scope

- No layout, no audio, no upload changes.
- Recap "Hero Video" step is unrelated and untouched.
