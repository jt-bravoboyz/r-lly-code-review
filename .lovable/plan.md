# Fix: Blank Video Tiles on Mobile Recap Screen

## What's actually broken

The blank tiles you're seeing on mobile are **not** the live Photo Feed — they're on the **R@lly Recap** screen (Past R@lly view). That screen renders media through a different component (`RecapMediaTile.tsx` + the hero `<video>` in `RecapTimeline.tsx`), which never received the mobile fix from the last round.

When `rally_media.thumbnail_url` is `null`:
- Desktop browsers render the first frame of `<video preload="metadata">` automatically — so it looks fine in preview.
- Mobile Safari and mobile Chrome refuse to decode that frame for inline videos and show a **blank rectangle** instead. That's the gap you're seeing.

The backfill we shipped last time only runs inside `EventPhotoFeed`, which isn't mounted on the Recap screen.

## The fix (3 surgical edits, no new migrations)

### 1. `RecapMediaTile.tsx` — branded placeholder + real `<img>` fallback

Replace the `<video>` fallback with the same gradient + `FileVideo` icon placeholder used in `EventPhotoFeed`. This guarantees a non-blank tile on every device, even before the backfill catches up.

```tsx
{isVideo ? (
  media.thumbnail_url ? (
    <img src={media.thumbnail_url} loading="lazy" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60
                    flex items-center justify-center">
      <FileVideo className="h-7 w-7 text-muted-foreground/60" />
    </div>
  )
) : ( /* photo */ )}
```

### 2. `RecapTimeline.tsx` — fix the hero video poster

The "Final Frame" hero uses `<video poster={hero.thumbnail_url || undefined}>`. When undefined, mobile shows a black box. Wrap it the same way: if no thumbnail, render the gradient placeholder + a centered Play badge that opens the video on tap (or just keep `controls` but stack the placeholder behind via CSS so it shows until tapped).

### 3. Run the same opportunistic backfill on the Recap screen

Lift the throttled backfill effect out of `EventPhotoFeed` into a small reusable hook (`useVideoThumbnailBackfill(eventId, mediaList)`) and call it from `RallyRecapScreen.tsx`. This way, when an attendee opens an old R@lly's recap on their phone, missing thumbnails get generated and written to the DB via the existing `set_rally_media_thumbnail` RPC — and the screen auto-refreshes through the existing realtime subscription.

```text
EventPhotoFeed ──┐
                 ├──> useVideoThumbnailBackfill(eventId, photos)
RallyRecapScreen ┘
```

No DB changes required — the RPC and storage policies from the previous fix already support this.

## Why this works on mobile when the previous attempt didn't

- Previous attempt assumed `<video preload="metadata">` would render a frame on mobile. It doesn't.
- This attempt **never relies on the mobile video decoder for previews** — it uses `<img>` for thumbnails and a static branded placeholder when the thumbnail is missing, plus a backfill that fills in real frames over time.

## Bonus cleanup (cheap, while we're in there)

- The console shows a `forwardRef` warning pointing at `RecapMediaTile` (something is passing it a `ref`). Wrap the component in `React.forwardRef` to silence it.
- The "EventDetail rendered 8 times" loop warning is unrelated to thumbnails and not user-visible — leave it for a separate pass unless you want it tackled now.

## Files to change

- `src/components/events/recap/RecapMediaTile.tsx` — placeholder + forwardRef
- `src/components/events/recap/RecapTimeline.tsx` — hero video placeholder
- `src/hooks/useVideoThumbnailBackfill.ts` — new (extracted from EventPhotoFeed)
- `src/components/events/EventPhotoFeed.tsx` — swap inline effect for the new hook
- `src/components/events/RallyRecapScreen.tsx` — call the new hook

No migrations, no schema changes, no new buckets.
