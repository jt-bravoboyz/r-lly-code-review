## Create App Review Test Account

Provision the `appreview@rlly.cloud` account in the backend so Apple's reviewers can sign in immediately and see a live demo R@lly.

### What gets created

**1. Auth user**
- Email: `appreview@rlly.cloud`
- Password: `R@llyReview2026!`
- Email auto-confirmed (reviewers can't access the inbox)
- Display name: `App Reviewer`

**2. Profile row** (`profiles` table)
- Handle: `appreview`
- Full name: `App Reviewer`
- Bio: short friendly line
- Avatar: R@lly orange initial placeholder
- Legal/onboarding flags pre-accepted so reviewer skips onboarding gates

**3. Demo squad** (`squads` + `squad_members`)
- Name: `Demo Crew`
- Reviewer added as captain
- 2–3 seeded demo member profiles (already-existing seed accounts if present, otherwise lightweight placeholder profiles) so the squad list isn't empty

**4. Live demo R@lly** (`events` + `event_attendees`)
- Title: `Demo Night — Welcome, Reviewer`
- Status: live (start time set ~1 hour in the past, end ~3 hours in the future, auto-refreshed by a scheduled re-seed if needed)
- Venue: a real address in a major US city (locked address visible to attendees)
- Reviewer pre-joined as attendee with `joined` status and onboarding flags satisfied
- 2–3 seeded co-attendees so the guest list and chat aren't empty
- One seeded chat welcome message: "Welcome to R@lly 👋 — tap around, everything's safe to explore."

**5. Friendships**
- Reviewer auto-friended with the seeded demo profiles so Friends tab is populated

### How it gets built

A single idempotent SQL migration (`create_app_review_account`) that:
- Uses `auth.admin`-equivalent SQL (`auth.users` insert with hashed password via `crypt()` + `gen_salt('bf')`, `email_confirmed_at = now()`)
- Wraps everything in `ON CONFLICT DO NOTHING` / upserts keyed on email + handle so re-running is safe
- Creates the profile, squad, event, attendees, friendships, and welcome chat message in the same transaction
- Tags the event with a `demo_review = true` flag (metadata column already supports JSON) so we can later filter or refresh it

### Keeping the demo R@lly "live" forever

Two options — pick one in the build phase:
- **Simple:** set the event end time far in the future (e.g., year 2030) and start time in the recent past. No cron needed.
- **Cleaner:** add a tiny scheduled edge function `refresh-demo-rally` that nudges the start/end times daily. Heavier but keeps the event feeling truly "tonight."

Default recommendation: **Simple** — one migration, zero moving parts, perfect for App Review.

### What does NOT change

- No frontend code edits
- No changes to onboarding, auth, or RLS logic
- No new env vars or secrets
- Live web app behavior untouched

### Deliverable

After the migration runs, you'll be able to sign into both the web app and the TestFlight build with:
- `appreview@rlly.cloud` / `R@llyReview2026!`
…and land directly inside a populated demo R@lly with a squad, friends, and chat already in place.
