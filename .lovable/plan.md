## Root Cause

Opening a R@lly throws a Postgres error:

```
structure of query does not match function result type
Number of returned columns (26) does not match expected column count (32)
```

`useEvent()` calls `public.get_event_safe(p_event_id)`, which is declared `RETURNS SETOF public.events`. The function body only `SELECT`s 26 columns. The flyer migration added 4 new columns to `events` (`flyer_theme`, `flyer_custom_image_url`, `flyer_og_url`, `flyer_og_generated_at`), and `invite_code_expires_at` / `invite_code_rotated_at` were already missing — so the SELECT no longer matches the row type.

Result: every `useEvent` call throws, React Query keeps refetching, the page sits on its skeleton (which the user reads as "shows me nothing"), and `EventDetail` triggers the render-loop detector.

## Fix

One migration that recreates `public.get_event_safe(uuid)` so its `SELECT` returns the full `events` rowtype, preserving the stealth-mode masking for `status` and `after_rally_*`:

```text
DROP FUNCTION public.get_event_safe(uuid);

CREATE FUNCTION public.get_event_safe(p_event_id uuid)
RETURNS SETOF public.events
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_viewer uuid;
BEGIN
  SELECT id INTO v_viewer FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  RETURN QUERY
  SELECT
    e.id, e.creator_id, e.title, e.description, e.event_type, e.image_url,
    e.start_time, e.end_time, e.location_name, e.location_lat, e.location_lng,
    e.is_barhop, e.created_at, e.updated_at, e.invite_code, e.is_quick_rally,
    CASE WHEN COALESCE(e.after_rally_stealth,false)
          AND e.status = 'after_rally'
          AND NOT public.is_after_rally_invited(e.id, v_viewer)
         THEN 'completed' ELSE e.status END AS status,
    CASE WHEN COALESCE(e.after_rally_stealth,false)
          AND NOT public.is_after_rally_invited(e.id, v_viewer)
         THEN NULL ELSE e.after_rally_location_name END,
    CASE … lat …,
    CASE … lng …,
    e.cover_charge, e.split_check, e.after_rally_stealth,
    CASE … invited_ids …,
    e.dress_code, e.song_recs_enabled,
    e.invite_code_expires_at, e.invite_code_rotated_at,
    e.flyer_theme, e.flyer_custom_image_url,
    e.flyer_og_url, e.flyer_og_generated_at
  FROM public.events e
  WHERE e.id = p_event_id;
END $$;
```

(Column order matches `information_schema.columns` ordinal positions 1‑33, masking logic unchanged.)

## Hardening (also in this pass)

Add a tiny defensive guard in `src/hooks/useEvents.tsx › useEvent` so a future schema drift surfaces a real error instead of an endless skeleton:

- Pass `retry: 1` and surface `error` so the page can show a friendly message rather than spinning.

No frontend behaviour changes; UI work is untouched.

## Files

- New migration: `supabase/migrations/<ts>_fix_get_event_safe_rowtype.sql`
- Edit: `src/hooks/useEvents.tsx` (only the `useEvent` query options)

## Verification

1. Run `select * from public.get_event_safe('7ac9026b-…')` → returns one row, no error.
2. Reload `/events/7ac9026b-…` while logged in → full event header, hero carousel, action bar render.
3. Console no longer shows the EventDetail render-loop warning.
