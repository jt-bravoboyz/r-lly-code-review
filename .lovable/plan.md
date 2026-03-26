

# Final System Hardening & Dual-Mode Admin Portal

## Section 1: Dual-Mode Admin Portal

### 1A. Partner/Technical Toggle (AdminDashboard.tsx)
- Add `useState<'partner' | 'technical'>` toggle to the admin header
- Render a segmented toggle button (e.g., two pills) next to the "Phase 6" badge
- Conditionally render Partner sections or Technical sections based on state

### 1B. Partner View
- Show: Growth Metrics, Safety Rate, K-Factor (invite copies / events created), Founder Panel
- Filter out test data: Pass admin emails list (`jt@bravoboyz.com`, `eric@bravoboyz.com`, `nick@bravoboyz.com`) to `useAdminAnalytics` and add a `filterAdminData` param
- In the hook, exclude `analytics_events` and `event_attendees` where `user_id` matches admin profile IDs
- Compute K-Factor = `inviteCopied / totalEventsCreated` and display as a new stat card

### 1C. Technical View
- Show: Funnel Chart (full 9-step), Live Activity Feed, Feature Flags
- Add new **Error Log Feed** component: query `analytics_events` where `event_name = 'error'` (or create a new table — but simpler to filter existing events and add a `trackEvent('client_error', ...)` call to the global error boundary)
- Add **Onboarding Drop-off** section: show funnel steps `signup → profile_created → first_event_created → first_event_joined` using existing analytics data

### 1D. Empty States
- For every metric card/section that shows `0` or empty arrays, render a styled placeholder:
  - Light illustration icon (e.g., `BarChart3` from lucide) with muted text "Waiting for data..."
  - Use `Skeleton` components for loading states
- Apply to: StatCards, TopHosts list, Feedback list, Activity Feed, Funnel bars

---

## Section 2: Stability Fixes

### 2A. Analytics Double-Fire Guard
- The `trackEvent` calls already use `useRef` guards in `EventDetail.tsx` (`hasTrackedViewRef`) and `HostSafetyDashboard.tsx` (`hasTrackedOpenRef`)
- No `useAnalytics.ts` hook exists — the user likely means the existing ref pattern. Verify all `trackEvent` call sites use refs where needed (mutations like `event_created` fire in `onSuccess` callbacks which are naturally single-fire)
- No changes needed beyond confirming existing guards are sufficient

### 2B. Join Button Fix (JoinSquad.tsx)
- Already uses `isJoining` state with `disabled={isJoining}` and shows `<Loader2>` spinner
- This is already implemented correctly — no change needed

---

## Section 3: Audit Fixes (7 Items)

### 3.1 Analytics Bypass (`src/lib/analytics.ts`)
Replace the production-only guard:
```typescript
// Before:
if (!import.meta.env.PROD) return;

// After:
const host = window.location.hostname;
const isAllowed = import.meta.env.PROD
  || host.endsWith('.lovable.app')
  || host.endsWith('.lovableproject.com');
if (!isAllowed) return;
```

### 3.2 Full Funnel (`src/hooks/useAdminData.tsx`)
Add `'invite_link_copied'` and `'rally_home_opened'` to the `funnelSteps` array (line 36-39).

### 3.3 PWA Icons (`public/manifest.json`)
Fix the 512px icon entry — currently reuses `rally-icon-192.png` with `"sizes": "512x512"`. Check if a 512px icon exists; if not, reference the 1024px icon scaled down or keep the 192px but with correct size declaration. Best fix: reference `rally-icon-1024.png` for the 512px entry.

### 3.4 Capacitor Config (`capacitor.config.ts`)
Wrap the `server` block in a development-only guard:
```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.30a08aa7cdeb4250a60c0605f836113c',
  appName: 'R@lly',
  webDir: 'dist',
  ...(process.env.NODE_ENV !== 'production' ? {
    server: {
      androidScheme: 'https',
      url: 'https://30a08aa7-cdeb-4250-a60c-0605f836113c.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    }
  } : {}),
};
```

### 3.5 BottomNav Cleanup (`src/components/layout/BottomNav.tsx`)
Remove line 82: `<div className="h-safe-area-inset-bottom bg-card" />` — the nav already has `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` on the parent.

### 3.6 Safety View RLS
Run a migration to enable RLS and add a SELECT policy on `event_safety_summary`:
```sql
ALTER VIEW public.event_safety_summary SET (security_invoker = on);
CREATE POLICY "Event members can view safety summary"
ON public.event_safety_summary FOR SELECT TO authenticated
USING (public.is_event_member(event_id));
```
Note: If `event_safety_summary` is a view (not a table), Postgres doesn't support RLS on views directly. Will check if it's a materialized view or regular view and adjust accordingly — likely need to convert to a function or ensure `security_invoker = true` is already set.

### 3.7 Row Limits (`src/hooks/useAdminData.tsx`)
Replace unbounded `.select()` calls with `.range(0, 4999)` or paginated fetches for `analytics_events`, `events`, `event_attendees`. For the admin dashboard, use `.range(0, 9999)` to handle up to 10k rows, which is sufficient for Founder 25 scale.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Add Partner/Technical toggle, conditional rendering, empty states |
| `src/hooks/useAdminData.tsx` | Add funnel steps, admin email filtering, row limit fix, K-Factor |
| `src/components/admin/AdminEmptyState.tsx` | **New** — reusable empty state component |
| `src/components/admin/ErrorLogFeed.tsx` | **New** — error log panel for Technical view |
| `src/components/admin/OnboardingDropoff.tsx` | **New** — onboarding funnel for Technical view |
| `src/lib/analytics.ts` | Allow preview/staging URLs |
| `src/components/layout/BottomNav.tsx` | Remove redundant safe-area div |
| `public/manifest.json` | Fix 512px icon reference |
| `capacitor.config.ts` | Add production guard for server block |
| `supabase/migrations/` | RLS for event_safety_summary (if applicable) |

13 changes across ~10 files. No user-facing UI flow changes. Admin-only enhancements + stability/audit fixes.

