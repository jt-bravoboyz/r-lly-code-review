## Confirmed Profile

Whitney Houston's actual profile ID is `c47f8c5d-bf0f-448e-a95f-ab8df725cbca` (not the placeholder ID). She is not currently in `event_attendees` for the Drunkies event, which is why all 449 media items are RLS-hidden from her account.

## Action

Run one INSERT against `event_attendees`:

```sql
INSERT INTO event_attendees (event_id, profile_id, status)
VALUES (
  '80e42cfb-80df-4919-92b7-83d47a34b47b',
  'c47f8c5d-bf0f-448e-a95f-ab8df725cbca',
  'attending'
);
```

Note: there's a `normalize_event_attendee_profile_id` BEFORE INSERT trigger that overwrites `profile_id` with the caller's profile. Since this insert will run as the service role (migration), the trigger's `auth.uid()` lookup returns NULL and the trigger short-circuits — `profile_id` is preserved. Verified by reading the trigger source.

Side effects (all desired):
- `add_attendee_to_chat_participants` trigger adds Whitney to the Drunkies event chat.
- RLS on `rally_media` (`is_event_member(event_id)`) immediately starts returning all 449 media rows for her.

## Verify

After the insert, reload `/events/80e42cfb-80df-4919-92b7-83d47a34b47b?previewRecap=1` as Whitney. Expect:
- Header counts: 📸 448 · 🎞️ 1
- Hero "Shot of the Night" image renders
- Photo Bundle grid + "View All (449 items)" button
- "The Paparazzi" award → princess ryry

## Files

No code changes. One data migration only.
