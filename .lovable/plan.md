## Admin Headcount Accuracy Fix

### The Problem (Confirmed in Audit)

In `src/hooks/useAdminData.tsx`, when an admin views the Partner or Commercial dashboard, **all attendee rows belonging to admin profiles (Sko, JT, Nick Haddad) are stripped from the entire `attendees` dataset** (line 93):

```ts
attendees = attendees.filter(a => !adminProfileIds.has(a.profile_id));
```

That same filtered array then powers everything downstream — host headcount badges, "Hosted Headcount" pills in User Intelligence, top-host averages, retention, transit splits.

**Real-world impact**: Caroline Kay's "WHIMSY KNIGHT OUT" R@lly had 4 attendees (Caroline + Sko + JT + Nick). The Partner view shows it as 1. The data is pristine in the DB — only the admin display is misleading her contribution.

The original intent of the filter is correct: **K-Factor and growth metrics should not be inflated by Sko/JT/Nick test-joining R@llies.** But headcount per event must always reflect ground truth. We're conflating two different needs into one filtered dataset.

### The Fix: Two Datasets, One Source of Truth

Split `useAdminData` into two parallel arrays:

- **`attendeesRaw`** — every row from the database (admins included). Used for any "true headcount" display: host badges, per-event headcount, founder activity, user intelligence.
- **`attendeesGrowth`** — admin-stripped (current behavior). Used for K-Factor, repeat-rate, conversion, retention, top-host averages, transit/safety aggregates that feed partnership decks.

Same split for events (`rallyEventsRaw` vs `rallyEventsGrowth`).

### Privacy Guarantees (Unchanged)

This change is privacy-safe because:

1. We are NOT exposing any new PII. The names "Sko", "JT", "Nick Haddad" are already visible to admins everywhere else (User Directory, Founders panel, Live Activity Feed).
2. No raw emails, phones, or location data are surfaced anywhere new.
3. The `getPrivateName()` and `admin_user_directory` SECURITY DEFINER RPC continue to gate sensitive lookups.
4. RLS on `event_attendees` is unchanged — only admins can see all rows.
5. Non-admin users cannot reach `useAdminData` at all (gated by `useAdminAuth`).

### Component Updates

| Component | New Source | Why |
|---|---|---|
| `UserIntelligence` "Hosted Headcount" badges | `attendeesRaw` headcount map | Show true # who showed up |
| `FounderPanel` "joined" / "safetyConfirmed" counts | `attendeesRaw` | Founder activity is ground truth |
| `GrowthMetrics` top hosts avg | `attendeesGrowth` | Keep K-Factor clean |
| `SafetyMetrics` rally-got-me / doing-myself | `attendeesRaw` | Real safety usage rate |
| `KFactorCard`, `AnalyticsCards` | `attendeesGrowth` | Partnership reporting |
| `AdminCSVExport` | `attendeesRaw` | Exports must match DB |
| `RetentionMetrics` | analytics events (unchanged) | Already separate |

### Headcount Map: Two Variants

`useAdminData` will return both:
- `headcountByEvent` (raw, for display)
- `headcountByEventGrowth` (admin-stripped, for K-Factor reporting)

UserIntelligence will consume `headcountByEvent` (raw), so Caroline's WHIMSY KNIGHT OUT correctly shows **4**.

### "What You're Filtering" Transparency Banner

Add a small inline note on the Partner view header:

> "Growth metrics exclude internal team activity (3 admin accounts). Per-event headcount reflects all attendees."

This makes the data philosophy explicit so partner conversations are clean.

### Files to Modify

1. `src/hooks/useAdminData.tsx` — return `attendeesRaw`, `attendeesGrowth`, `headcountByEvent` (raw), `headcountByEventGrowth`, `rallyEventsRaw`, `rallyEventsGrowth`. Recompute the headcount map from `attendeesRaw`.
2. `src/pages/AdminDashboard.tsx` — pass `attendeesRaw` to UserIntelligence, FounderPanel, SafetyMetrics, AdminCSVExport. Pass `attendeesGrowth` to KFactor / Analytics / Growth top-hosts. Add the transparency banner.
3. `src/components/admin/UserIntelligence.tsx` — accept and use the raw `headcountByEvent` prop (already wired, just needs the right source).
4. `src/components/admin/FounderPanel.tsx` — read from raw attendees.
5. `src/components/admin/SafetyMetrics.tsx` — read from raw attendees.
6. `src/components/admin/AdminCSVExport.tsx` — read from raw attendees so exported CSVs match the database.

### Out of Scope

- No DB migration. RLS policies stay identical.
- No new PII surfaces. No new realtime subscriptions (existing `useNotifications` realtime is sufficient and the admin dashboard is a snapshot view by design).
- No change to the Technical view (already shows raw data).

### Verification After Implementation

I will spot-check Caroline Kay and Ansley Guyton's events in the Partner view and confirm:
- WHIMSY KNIGHT OUT shows 4 (was 1)
- Excavation Nation shows 3
- D-Diddy's Beach Motion shows 4
- K-Factor and top-host avg numbers stay unchanged from current values (proving growth metrics are still admin-cleaned)