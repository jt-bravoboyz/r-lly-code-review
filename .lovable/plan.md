## Why the recap never loads

The `useEvent` hook fetches every event detail page through the `get_event_safe` Postgres function. That function declares `RETURNS SETOF events` and hand-lists each column in its `SELECT`. The recent "Split badge" migration added a new `tabs_activated` column to `public.events`, but `get_event_safe` was never updated. Postgres now refuses to run it:

```
ERROR: structure of query does not match function result type
DETAIL: Number of returned columns (32) does not match expected column count (33).
```

`useEvent` throws, `event` is `null`, and `EventDetail` hits its `if (!event) return <Navigate to="/events" />` guard — so tapping any past R@lly bounces straight back to the events list before the Recap can render.

## Fix

Run a migration that replaces `public.get_event_safe(uuid)` with the same body plus `e.tabs_activated` appended to the final `SELECT` list (preserving column order). No other behavior changes.

### Verification

1. Re-run `SELECT * FROM public.get_event_safe('<any-event-id>')` — should return one row, no error.
2. In the preview, open Past R@llies → tap a past event → confirm the R@lly Recap (tour overlay, then timeline) mounts instead of redirecting to `/events`.
3. Spot-check an upcoming and a live event detail page still load normally.

No frontend changes required.
