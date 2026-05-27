## Problem

Mia Abbott (and likely others) hits `new row violates row-level security policy for table "events"` when creating an event. Confirmed in Postgres logs today at 15:41 UTC.

The `events` INSERT policy requires:
```
creator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
```

The client sends `creator_id: profile.id` from `useAuth`. If `profile` is null/stale on her device (sign-in race, account switch, slow profile fetch, OAuth retry), the wrong (or no) id is sent and Postgres rejects the insert as "permission denied."

## Fix

Replace the direct client INSERT with a `SECURITY DEFINER` RPC `create_event(...)` that:

1. Resolves the caller's profile from `auth.uid()` server-side.
2. Rejects if no session / no profile (clear error message).
3. Inserts the event with `creator_id = <resolved profile id>` — impossible for the client to send a wrong id.
4. Returns the full event row.

This matches the existing pattern used for `request_join_event`.

### Migration

Create function `public.create_event(p_title text, p_description text, p_event_type text, p_start_time timestamptz, p_location_name text, p_location_lat double precision, p_location_lng double precision, p_is_barhop bool, p_cover_charge numeric, p_split_check bool, p_dress_code text, p_song_recs_enabled bool, p_flyer_theme text, p_flyer_custom_image_url text, p_is_quick_rally bool default false) returns public.events` — SECURITY DEFINER, search_path=public. Looks up profile, raises a friendly exception if missing, inserts, returns row.

Grant EXECUTE to `authenticated`.

### Frontend

Update `useCreateEvent` in `src/hooks/useEvents.tsx` to call `supabase.rpc('create_event', { ... })` instead of `from('events').insert(...)`. Keep the same success-side effects (invalidate queries, award points, analytics).

Update both `CreateEventDialog.tsx` and `QuickRallyDialog.tsx`:
- Stop passing `creator_id` (server derives it).
- On error, surface the server message (e.g. "Your profile isn't ready yet — give it a sec and try again") instead of the generic "Permission denied".

No RLS policy changes — the existing INSERT policy stays as a defense-in-depth check, which the SECURITY DEFINER function naturally satisfies.

### Verification

- Re-run a create as Mia (or via SQL impersonating her user) and confirm an event row is inserted with `creator_id = 82d4faee-…`.
- Confirm existing flows (chat auto-create trigger, attendee auto-join, points award) still fire.
