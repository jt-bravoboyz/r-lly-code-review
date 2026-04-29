## Add Taniya Boatwright to Joey's Backyard Bash

**Note on spelling:** The only matching profile in the database is **Taniya Boatwright** (not "Tania"). Assuming this is the same person.

### Match details
- **Event:** Joey's Backyard Bash (host: Nick Haddad, starts Apr 28 2026 10pm ET)
  - `event_id`: `b0738257-5895-4ed1-b535-09f35a9def14`
- **Attendee:** Taniya Boatwright
  - `profile_id`: `c1a80185-2b43-414b-a80c-32ffb54ea30c`
- **Current status:** Not currently on the rally (no `event_attendees` row).

### Action
Run a one-row insert into `event_attendees`:

```sql
INSERT INTO event_attendees (event_id, profile_id, status, joined_at)
VALUES (
  'b0738257-5895-4ed1-b535-09f35a9def14',
  'c1a80185-2b43-414b-a80c-32ffb54ea30c',
  'attending',
  now()
);
```

Status `attending` skips the host approval queue and adds her directly as a confirmed attendee (same as if Nick had accepted her join request). She'll appear in the attendee list, get access to the event chat, ride coordination, and the photo/video feed.

### Files
No app code changes — this is a one-shot data action via a migration.

### Confirm before I run
1. Is **Taniya Boatwright** the right person? (Spelling in profile is *Taniya*, not Tania.)
2. Should she go in as **`attending`** (direct add) or **`pending`** (Nick has to approve in-app)?
