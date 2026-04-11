

# Plan: End-to-End Founding 25 Hardening & VIP Account Repair

## Current State

- **Whitney Houston**: `founding_member = false`, `founder_number = null` — broken
- **Hixx**: Already repaired (`founding_member = true`, `founder_number = 1`)
- **Caroline Kay**: `founding_member = true` but `founder_number = null` — needs assignment
- Unsafe delete migration still in repo
- `handle_new_user()` and `claim_founding_spot()` both use race-prone `MAX(founder_number) + 1`
- Client clears `localStorage` flag before confirming DB state, causing stale UI
- Banner has no optimistic fallback for slow DB sync

---

## Implementation Steps

### 1. Manual Data Repair (Direct DB updates)

Update Whitney's profile: `founding_member = true`, `founder_number = 3`, `needs_name_setup = true`.
Update Caroline Kay's profile: `founder_number = 2` (she's already a founder but missing a number).

### 2. Neutralize Unsafe Migration

Replace contents of `supabase/migrations/20260411012456_e05b826d-b7a9-403f-aa36-e0296393735c.sql` with a no-op comment. This prevents the `DELETE FROM auth.users` from ever running again.

### 3. Harden `handle_new_user()` (Database Migration)

Replace the trigger function with an atomic version:
- Use `pg_advisory_xact_lock(42)` to serialize founder-number allocation
- Accept both `'true'` (string) and `true` (boolean) for `founding_member` metadata
- Preserve the full name fallback chain and `needs_name_setup` for Apple relay users
- Use `SELECT ... FOR UPDATE` pattern to prevent number collisions

### 4. Harden `claim_founding_spot()` (Same Migration)

Replace with the same atomic locking pattern:
- `pg_advisory_xact_lock(42)` before reading `MAX(founder_number)`
- Accept calls idempotently (return `true` if already a founder)

### 5. Fix Auth Pass-Through (`src/hooks/useAuth.tsx`)

- After `claim_founding_spot()` succeeds, **re-fetch the profile** before clearing the `localStorage` flag
- Only clear `rally-founding25` when `profile.founding_member === true` is confirmed from the DB
- This eliminates the stale-state window

### 6. Optimistic FoundingMemberBanner (`src/components/onboarding/FoundingMemberBanner.tsx`)

- Add fallback: show banner if `localStorage.getItem('rally-founding25') === 'true'` even when `profile.founding_member` hasn't synced yet
- When in optimistic mode, show "Founding Member" without a number (graceful fallback)
- Keep Canny link hard-coded to `https://rally.canny.io`

### 7. Welcome Toast (`src/hooks/useNotifications.tsx`)

- When a `founding_member_welcome` notification type is received (or inline after profile confirms founder status), fire a sonner toast: "Welcome to the Founding 25. Access granted to the Canny feedback portal."

---

## Technical Details

```text
Database updates (via insert tool):
  - Whitney: SET founding_member=true, founder_number=3, needs_name_setup=true
  - Caroline: SET founder_number=2

Migration (schema change):
  - Neutralize 20260411012456 migration → no-op
  - New migration: CREATE OR REPLACE handle_new_user() with pg_advisory_xact_lock(42)
  - New migration: CREATE OR REPLACE claim_founding_spot() with pg_advisory_xact_lock(42)

Files modified:
  - supabase/migrations/20260411012456_e05b826d...sql → no-op
  - New migration for hardened functions
  - src/hooks/useAuth.tsx → re-fetch after claim, delayed flag clear
  - src/components/onboarding/FoundingMemberBanner.tsx → optimistic fallback
```

