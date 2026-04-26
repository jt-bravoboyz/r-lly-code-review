## Admin Dashboard — Apple Pro Overhaul (Ready to Ship)

The "Two Datasets" headcount fix is already shipped. This plan delivers Phases 1 & 2 in one sweep, with plain-English tooltips on every technical metric.

### Architecture Confirmed

- **Tooltip primitive**: `src/components/ui/tooltip.tsx` already exists.
- **Mapbox**: Project uses the **Static Images API** pattern (no `mapbox-gl` runtime dep). HeatMap will follow the same pattern via `src/hooks/useMapboxToken`.
- **No new dependencies. No new RLS. No new realtime subscriptions.**

---

### Files to CREATE

**1. `src/components/admin/BentoCard.tsx`** — premium card primitive
- `rounded-3xl`, hairline border, `backdrop-blur-sm`, hover lift (`-translate-y-0.5`), inner gradient highlight.
- Variants: `default` | `accent` (orange ring) | `hero` (orange ambient glow + ring).
- Bento span props: `span={1-12}` for md+ columns, `rowSpan={1-3}` optional.

**2. `src/components/admin/MetricPill.tsx`** — unified data pill
- Consistent height (`h-7`), `tabular-nums`, optional icon, optional `tone` (`default | accent | success | warning`).
- Replaces the dozen inconsistent badge styles across admin cards.

**3. `src/components/admin/InfoTip.tsx`** — plain-English tooltip
- Tiny `Info` icon (h-3.5) that on hover/tap shows a 1-2 sentence partner-friendly explanation.
- Wraps shadcn Tooltip. Touch-friendly via Tooltip's existing `delayDuration={150}`.
- Used on every technical metric (K-Factor, DAU/WAU/MAU, Cohorts, etc.) so non-technical partners understand at a glance.

**4. `src/components/admin/GrowthNarrative.tsx`** — HERO of Partner view
- Hero `BentoCard` (variant="hero", span={12}) at the very top.
- Headline: `"{kFactor.toFixed(1)}x"` viral coefficient in `text-5xl font-montserrat`.
- Below: top 3 viral hosts with name + R@llies created + invites copied + personal K-factor.
- Right side: week-over-week repeat-rate delta with up/down arrow.
- Includes InfoTip explaining "Each R@lly creates X new R@llies through invites."

**5. `src/components/admin/HeatMap.tsx`** — geographic hot zones
- Uses `useMapboxToken` + Static Images API (same pattern as `AttendeeMap`).
- Plots `pin-s+E66210` markers for each event with valid lat/lng, auto-fit bounds.
- Headline: "Where R@llies ignite — last 30 days" + count chip.
- Empty state: "Hot zones will appear once R@llies have geolocation data."

**6. `src/components/admin/RetentionCohorts.tsx`** — 4-week cohort strip
- 4 rows, one per recent week. Each row shows: week label + % returned in week+1, week+2, week+3.
- Sparkline-style horizontal bars with R@lly orange.
- InfoTip: "Of users who joined a R@lly the week of [date], this is the % who came back to another R@lly in following weeks."

### Files to MODIFY

**7. `src/hooks/useAdminData.tsx`**
- Add `location_lat, location_lng` to events SELECT.
- Compute `topViralHosts`: array of `{ profileId, displayName, avatarUrl, ralliesCreated, invitesCopied, viralCoefficient, headcountDelivered }` — top 3 by `invitesCopied / ralliesCreated`.
- Compute `weeklyCohorts`: 4-week matrix of return rates from `attendeesRaw` joined to event dates.
- Expose `eventLocations`: `[{id, lat, lng, location_name}]` for HeatMap.
- All from RAW data (admins excluded for top hosts since K-Factor reporting context).

**8. `src/pages/AdminDashboard.tsx` — full re-skin**
- Header gets `backdrop-blur-xl bg-card/70 border-b border-border/40` (the "Apple layer").
- Background gets a soft radial gradient via inline style.
- View-mode toggle becomes segmented pill with sliding orange indicator (CSS `transition-[transform]`).
- Convert all `space-y-6` stacks to a 12-column bento grid: `grid grid-cols-1 md:grid-cols-12 gap-4`.
- Mount order in Partner view:
  1. **GrowthNarrative** (hero, span 12)
  2. KFactorCard (span 4) + AnalyticsCards split (span 8)
  3. **HeatMap** (span 6) + **RetentionCohorts** (span 6)
  4. RetentionMetrics (span 12)
  5. SquadInsights (span 6) + SafetyROI (span 6)
  6. GrowthMetrics (span 6) + SafetyMetrics (span 6)
  7. FounderPanel (span 6) + FeedbackPanel (span 6)
  8. TopConnectors (span 12)
  9. UserDirectory (span 12)
  10. ReferralAudit (span 12)
  11. SystemFeedbackCard (span 12)
  12. CSV export
- Cross-fade between view modes via `key={viewMode}` + `animate-fade-in`.
- Re-skin the existing transparency banner with the new pill aesthetic (copy unchanged).

**9. Sweep across these admin components — wrap in BentoCard, add InfoTips on technical metrics:**
- `KFactorCard.tsx` — InfoTip: "How many new invites each R@lly generates. Above 1.0 means the app is growing on its own."
- `AnalyticsCards.tsx` — InfoTips on each metric.
- `RetentionMetrics.tsx` — InfoTips: "DAU = users active in the last 24 hours. WAU = last 7 days. MAU = last 30 days."
- `GrowthMetrics.tsx`, `SafetyMetrics.tsx`, `SafetyROI.tsx`, `SquadInsights.tsx`, `FounderPanel.tsx`, `UserIntelligence.tsx`, `CommercialDashboard.tsx`, `TopConnectors.tsx`, `ReferralAudit.tsx`, `UserDirectory.tsx`, `FeedbackPanel.tsx`, `LiveActivityFeed.tsx`, `OnboardingDropoff.tsx`, `ErrorLogFeed.tsx`, `FeatureFlags.tsx`, `SquadAudit.tsx`, `FunnelChart.tsx`, `SystemFeedbackCard.tsx` — wrap with BentoCard, swap one-off badges for MetricPill where it improves consistency.

### Privacy Guarantees (Unchanged)
- No new PII. RLS unchanged. HeatMap uses host-provided event location only (not user GPS).
- All admin gating via `useAdminAuth` is preserved.
- The "Two Datasets" model from last turn stays intact: hero K-Factor and viral metrics use admin-stripped data; per-event headcount uses raw data.

### What ships in this sweep
- Phase 1: full visual shell (glass header, bento grid, sliding view toggle, BentoCard everywhere, MetricPill everywhere, animated view transitions).
- Phase 2: GrowthNarrative hero + HeatMap + RetentionCohorts + InfoTips on every technical metric.
- Phase 3: already shipped — banner stays, just re-skinned.

### Verification
- TypeScript build passes.
- Partner view loads with bento grid + hero GrowthNarrative.
- HeatMap renders Mapbox image or graceful empty state.
- Every K-Factor / cohort / DAU number has a hoverable Info icon with plain-English copy.
- 375px mobile collapses bento to single column without overflow.
- View-toggle smoothly animates between Partner / Commercial / Technical.