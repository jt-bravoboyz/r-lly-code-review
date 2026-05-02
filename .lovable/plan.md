## Plan: Guarantee video grid thumbnails paint

I’ll make a focused change in `EventPhotoFeed.tsx` to stop blank video tiles when browser metadata loading never starts.

### What will change

1. **Track poster fallbacks per video**
   - Add local state for videos that need a forced image poster fallback.
   - This avoids marking the video as broken; it simply swaps the visible cover art source.

2. **Derive a `thumb.jpg` backfill URL from the video URL**
   - If `thumbnail_url` already exists, keep using it as the primary grid image.
   - If `thumbnail_url` is missing, derive the expected backfill image URL next to the video file:
     - `.../video.mp4` → `.../video_thumb.jpg`
     - `.../video.mov` → `.../video_thumb.jpg`
   - This matches the existing upload/backfill naming convention in the media code (`${baseId}_thumb.jpg`).

3. **Add the 1-second readyState watchdog**
   - For fallback `<video>` tiles, attach a ref callback.
   - After 1 second, check `video.readyState`.
   - If it is still `0`, switch that tile to the derived `thumb.jpg` URL so the tile paints a real image instead of a blank video poster.
   - Clear timers safely when the element unmounts/re-renders.

4. **Render the forced fallback as an image**
   - Once the watchdog fires, render `<img src={derivedThumbUrl}>` for that video tile.
   - Keep the play badge overlay so it still reads as a video.
   - If the derived thumb fails to load, fall back to the existing “Tap to open” broken-video treatment.

### Technical detail

The grid path will become:

```text
video tile
├─ thumbnail_url exists -> <img src={thumbnail_url} />
├─ watchdog forced fallback -> <img src={derived *_thumb.jpg URL} />
└─ otherwise -> <video poster="video#t=0.001" src="video#t=0.001" preload="metadata" />
```

This is only a client/UI fallback. It won’t change upload behavior, database rows, event privacy, or parent R@lly media visibility.