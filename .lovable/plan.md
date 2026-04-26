## The Hamilton Pass — App-Wide Admin Dashboard Refinement

### 1. Fix the Data "Ghost" (Critical)

**Diagnosis.** When the date filter is `today` (or any non-`all` preset), `useAdminData` filters `filteredRallyEvents` to events *created* in the last 24h, then attendees are filtered to only those event IDs. But `events` (analytics) is filtered by *event timestamp*. So an invite copy/redeem fired today on Ansley's older R@lly:

- ✅ Counts toward `inviteCopied` → inflates K-Factor
- ❌ The R@lly itself is excluded from `filteredRallyEvents`
- ❌ So all of its attendees are stripped from `attendees`
- ❌ `verified` shows 0, `K-Factor` shows 7x — the ghost

**Second bug.** `RallyPulse.verified` reads `totalLifetimeAttendees`, computed as `attendees.filter(a => a.status === 'attending').length`. Many real attendees have `status = 'going'` or `null` and are silently dropped.

**The fix** (`src/hooks/useAdminData.tsx`):

- Decouple the date filter for activity from event-creation date. When a date preset is active, build a set of *active rally IDs* = events created in the window **OR** events that received any signal (analytics event, attendee join, invite) in the window. Use that union as the basis for `filteredRallyEvents` and `attendees`.
- Compute `verified` as `attendees.filter(a => a.status === 'attending' || a.status === 'going' || a.arrived_safely === true || a.going_home_at !== null).length` — i.e. anyone with real on-the-ground signal. Rename internally to `verifiedFootTraffic`.
- Add a single `attributionAudit` object the dashboard can render in dev: `{ totalInvites, sumOfHostInvites, totalAttendees, sumOfHostAttendees }` so the Hamilton "no echoes" rule is verifiable.
- `RallyPulse` reads `verifiedFootTraffic` from `summary` (unified source of truth with `GrowthNarrative`'s host attendee counts).

### 2. Universal Visual Refinement — Bento + Glass everywhere

Apply the existing `BentoCard` / `MetricPill` / `InfoTip` / `LiveNowBadge` primitives (see `mem://style/admin-apple-pro-design`) to every legacy admin component.

**Refactor (in place — no new files unless noted):**

- `RetentionMetrics.tsx` — drop `Card`, render as a 6-up `BentoCard` strip with `tabular-nums`, hide DAU/WAU duplication when MAU dominates the hero.
- `FounderPanel.tsx` — bento conversion; collapse the 3 summary tiles into one `MetricPill` row above the founder list.
- `GrowthMetrics.tsx` — convert to bento; **remove the "Top Hosts" sub-list entirely** (echoes `GrowthNarrative.topViralHosts`).
- `SafetyMetrics.tsx` — bento conversion; remove "After R@lly Rate" tile (already implied by safety pulse).
- `FunnelChart.tsx` — bento conversion, glass bars, `tabular-nums`, soft primary gradient on bars.
- `CommercialDashboard.tsx` — full bento rewrite (see §3).
- `OnboardingDropoff.tsx`, `LiveActivityFeed.tsx`, `ErrorLogFeed.tsx`, `FeatureFlags.tsx`, `SquadAudit.tsx`, `UserIntelligence.tsx`, `FeedbackPanel.tsx`, `SystemFeedbackCard.tsx`, `ReferralAudit.tsx`, `UserDirectory.tsx`, `TopConnectors.tsx` — wrap in `BentoCard` headers with consistent `text-xs uppercase tracking-wider text-primary` eyebrows and `tabular-nums` on every number.

### 3. Page-Specific Storytelling

**Geography (Partner + Commercial sub-tab):**
- `HeatMap` becomes the hero (span 12, taller aspect `16/6`).
- Demote the "list view" of cities into a small `MetricPill` cluster ("Top: Atlanta · NYC · LA") under the map.
- Remove `SquadInsights` / `SafetyROI` from Geography (move SafetyROI into Retention sub-tab; SquadInsights into Hosts).

**Retention:**
- New hero: `RetentionCohorts` rendered with **sparkline overlays** per cohort row (4-week trend curve in the row background) — extend the existing component, no new file.
- `RetentionMetrics` demoted to a single horizontal bento strip below the cohort hero.
- `SafetyROI` joins this view as the secondary card (retention = repeat behavior = safety follow-through).

**Founders:**
- New hero `FounderPulse` block at top (mirrors RallyPulse): `Claimed → Hosted → Connected → Safe`. Keep the existing roster list below in cleaner bento rows. (Inlined into `FounderPanel.tsx` — no new file.)

**Commercial:**
- Rewrite `CommercialDashboard.tsx` around ROI vocabulary:
  - Hero: **Revenue Potential** (= GMV + projected GMV from currently-live paid R@llies).
  - Bento row: `Realized Revenue` · `Avg Ticket` · `Paid R@llies` · `Avg Dwell (mins)`.
  - Replace "Member Count" / "Event Density by City" copy with **"Market Penetration"** ranked list.
  - "Rideshare Provider Split" relabeled **"Transit Liquidity"** with a stacked horizontal bar.
- Add the `LiveNowBadge` when any paid R@lly is live (new field `livePaidNowCount` in the hook).

**Technical:**
- Bento conversion across Funnel / Users / System.
- `FunnelChart` keeps the funnel bars but adopts glass + tabular-nums; mode split moves into a small footer pill row (no separate sub-card).
- Add `LiveNowBadge` to the System tab header.
- **Error Log Feed exception (debug-grade contrast):** `ErrorLogFeed` is wrapped in a `BentoCard` for layout consistency, but the inner content keeps a high-contrast utility skin so it stays usable in the field:
  - Solid `bg-background` (not the glass tint) on the log surface, full-opacity borders.
  - Severity prefixes use saturated tokens: `ERROR` → `text-red-500`, `WARN` → `text-amber-500`, `INFO` → `text-sky-400`, with bold weight and uppercase.
  - Monospace stack traces (`font-mono text-xs leading-snug`) with `whitespace-pre-wrap` and `break-all` so nothing clips on mobile.
  - Row hover/active state uses a strong `bg-foreground/5` so a tapped error stays visible in sunlight.
  - Keep copy-to-clipboard on each row and a "Copy all visible" button in the card header. No glass blur, no muted-foreground body text — readability beats aesthetics here.

### 4. The Hamilton Rule — Echo Audit

For each tab, the same number must appear at most once across hero + sub-cards.

| Metric | Hero owner | Removed echoes |
|---|---|---|
| K-Factor (`x.xx`) | `GrowthNarrative` | already removed `KFactorCard` import; delete file |
| Top hosts | `GrowthNarrative` | remove `GrowthMetrics.topHosts` block |
| Total R@llies created | `RallyPulse.created` | remove from `GrowthMetrics` chip text |
| Verified attendees | `RallyPulse.verified` | remove from `FounderPanel` summary tiles (keep per-founder only) |
| Safety rate | `RallyPulse.safety` | remove `SafetyMetrics.afterRallyRate` |
| GMV | `CommercialDashboard.realizedRevenue` | drop the duplicate "Total Revenue" mini-tile |
| Paid event count | `CommercialDashboard` chip | remove subtitle on GMV card |

Delete `KFactorCard.tsx` (unused after removal).

### 5. Polish Pass

- `tabular-nums` on every numeric span across all admin components (audit pass).
- `LiveNowBadge` in the header eyebrow of every tab whose data is currently active (`liveNowCount > 0` for Partner/Geography/Retention; `livePaidNowCount > 0` for Commercial; analytics-stream-active for Technical/System).
- All new section headers use the eyebrow pattern: `text-xs font-semibold uppercase tracking-wider text-primary` — except Error Log Feed, which keeps a debug-grade skin (see §3 Technical).
- Mobile: every bento row collapses to single column under `sm`, identical to `RallyPulse` pattern.

### Files

**Modified:**
- `src/hooks/useAdminData.tsx` (ghost fix, `verifiedFootTraffic`, `livePaidNowCount`, `attributionAudit`)
- `src/components/admin/RallyPulse.tsx` (consume new field)
- `src/components/admin/CommercialDashboard.tsx` (full ROI rewrite)
- `src/components/admin/RetentionMetrics.tsx`, `RetentionCohorts.tsx` (sparkline overlay)
- `src/components/admin/FounderPanel.tsx` (FounderPulse hero)
- `src/components/admin/ErrorLogFeed.tsx` (bento shell + high-contrast utility skin, copy-all button)
- `src/components/admin/GrowthMetrics.tsx`, `SafetyMetrics.tsx`, `FunnelChart.tsx`, `HeatMap.tsx`, `OnboardingDropoff.tsx`, `LiveActivityFeed.tsx`, `FeatureFlags.tsx`, `SquadAudit.tsx`, `UserIntelligence.tsx`, `FeedbackPanel.tsx`, `SystemFeedbackCard.tsx`, `ReferralAudit.tsx`, `UserDirectory.tsx`, `TopConnectors.tsx` (bento + tabular-nums)
- `src/pages/AdminDashboard.tsx` (re-wire Geography/Retention/Founders/Commercial layout, remove `KFactorCard` import)

**Deleted:**
- `src/components/admin/KFactorCard.tsx`

**New:** none — everything reuses existing primitives.
