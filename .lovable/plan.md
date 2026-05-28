# Delete Two Events

Delete the following two events and all their related data (attendees, bar-hop stops, chat messages, media, etc.) via a migration that uses `DELETE FROM events WHERE id IN (...)` — cascading foreign keys will clean up child rows.

## Targets

1. **`R@LLY`** — `f4316445-8dad-4d89-82a1-e054dd78cf91` (scheduled, 2026-05-28)
2. **`Mid-Summer Brunch`** (currently open in your preview) — `2f58e0da-0ef7-4793-9dc6-5627131ba73a` (scheduled, 2026-06-20)

Note: there's also a `Mid-Summer Brunch 🌷` (dcd42a15…) — that one will NOT be touched. Confirm before I proceed if you actually meant that flower one instead.

## Steps

1. Run a Supabase migration: `DELETE FROM public.events WHERE id IN ('f4316445-8dad-4d89-82a1-e054dd78cf91', '2f58e0da-0ef7-4793-9dc6-5627131ba73a');`
2. No code changes required — the events list queries will refresh automatically.