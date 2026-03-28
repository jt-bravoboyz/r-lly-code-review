

# Founder 25 Go-Live Implementation

## 4 Workstreams

### 1. Data Reset — DELETE from 16 tables
Execute via the database insert tool in dependency order:
1. `ride_passengers`, `ride_offers`, `rides`
2. `barhop_stops`
3. `event_dd_requests`, `dd_disclaimer_acceptances`
4. `event_feedback`
5. `event_invites`, `phone_invites` (if exists)
6. `messages`, `chat_participants`, `chats`
7. `event_attendees`, `events`
8. `analytics_events`
9. `venue_presence`

All profiles, user_roles, squads, badges, feature_flags preserved.

### 2. Caroline Kay — Founder Badge
Execute via insert tool:
```sql
UPDATE profiles SET founding_member = true WHERE id = 'a5bdc43f-7fa7-4893-8343-da76cfc4a77f';
```

### 3. Growth & Retention Dashboard

**New file: `src/components/admin/RetentionMetrics.tsx`**
- Card grid: Total Users, DAU (24h), WAU (7d), MAU (30d), 3-Month, 6-Month, Yearly
- Each card: count + percentage (with `totalUsers === 0` guard → shows "0%")
- Uses `data.retention` passed as prop

**Edit: `src/hooks/useAdminData.tsx`**
- After existing profile fetch, count `profiles.length` as `totalUsers`
- Derive active user counts from `analytics_events` by counting distinct `user_id` where `created_at` falls within each window (1d, 7d, 30d, 90d, 180d, 365d)
- Add `retention` to return object

**Edit: `src/pages/AdminDashboard.tsx`**
- Import `RetentionMetrics`
- Render between `AnalyticsCards` and `GrowthMetrics` in Partner view

### 4. Profile Email/Phone Sync

**Edit: `src/pages/Profile.tsx`**
- Add `editEmail` state, initialize from `user.email` in `handleStartEdit`
- Add email input field below name in edit mode (with `Mail` icon)
- In `handleSaveProfile`:
  - If email changed: call `supabase.auth.updateUser({ email: newEmail })`, show toast: "Check your new email for a verification link to finalize the change."
  - If phone changed: call `supabase.auth.updateUser({ phone: normalizedPhone })` alongside the profile table update
- Validation: basic email format regex, phone 10+ digits (already handled)

## Files

| File | Change |
|------|--------|
| `src/components/admin/RetentionMetrics.tsx` | **New** — retention cards |
| `src/hooks/useAdminData.tsx` | Add retention metrics calculation |
| `src/pages/AdminDashboard.tsx` | Add RetentionMetrics import + render |
| `src/pages/Profile.tsx` | Add email editing + auth.updateUser sync |
| Database (insert tool) | DELETE 16 tables + UPDATE Caroline Kay |

