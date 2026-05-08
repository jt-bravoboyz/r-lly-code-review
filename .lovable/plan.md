# Fix: DD can't see waiting riders in the Rider Line

## Root cause

The Rider Line component (`src/components/rides/RiderLine.tsx`) joins to the raw `profiles` table via the embedded select syntax:

```
.select(`..., passenger:profiles!ride_passengers_passenger_id_fkey(id, display_name, avatar_url)`)
.select(`..., profile:profiles!event_attendees_profile_id_fkey(id, display_name, avatar_url)`)
```

The `profiles` table RLS only allows `auth.uid() = user_id` — i.e. each user can only read their *own* profile row. So when Aidan's client fetches JT's pending request / broadcast `needs_ride` row, the embedded `passenger`/`profile` join returns `null`, and JT gets filtered out of the rider list. JT's `event_attendees` row (with `needs_ride = true`, pickup at "Teddy Bear Circle") is in the DB — Aidan just can't resolve the name/avatar, so the row is dropped.

This same pattern is already solved elsewhere in the project via the `safe_profiles` view (per project Core memory: "Raw `profiles` is restricted. Use `safe_profiles` view for PII").

## Fix

Update `src/components/rides/RiderLine.tsx` in two places:

1. **Pending `ride_passengers` source**: drop the embedded `profiles!...` join. Select `passenger_id` instead, then do a separate `.from('safe_profiles').select('id, display_name, full_name, nickname, avatar_url').in('id', passengerIds)` and merge in JS.

2. **Broadcast `needs_ride` source**: same change — drop the `profile:profiles!...` embed, fetch attendee rows with `profile_id`, then resolve names/avatars from `safe_profiles` in a follow-up query and merge.

Keep all other logic (location merging, distance sort, "already accepted" exclusion, pick handler) identical.

Verify the same `safe_profiles` swap is also applied to `src/components/rides/AddPassengerDialog.tsx` (added in the previous turn), which has the same `profile:profiles!event_attendees_profile_id_fkey(...)` embed and would hit the same RLS wall when listing attendees.

## Why not change RLS

Loosening `profiles` SELECT would expose PII project-wide; the established pattern is the public-safe view. No DB migration needed.

## Files

- edit `src/components/rides/RiderLine.tsx` — replace both embedded profile joins with `safe_profiles` lookups
- edit `src/components/rides/AddPassengerDialog.tsx` — same swap for the attendee picker
