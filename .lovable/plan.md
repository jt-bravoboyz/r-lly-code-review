

# Partnership BI Build — Implementation Plan

## 8 Files (5 New, 3 Modified)

### 1. `src/hooks/useAdminData.tsx` — Add dateRange + 6 new metrics

**Accept `dateRange` param** (`'today' | '7d' | '30d' | 'all'`). Filter `events`, `attendees`, `analytics_events` by `created_at >= cutoff` before all calculations.

**New metrics added to return object:**
- `kFactor` — already computed, just needs surfacing (done)
- `avgSquadSize` — `attendees.length / filteredRallyEvents.length`
- `peakActivity` — group `rally_started` analytics events by `dayOfWeek + hour`, find max bucket, format as "Prime Brand Engagement Window: Saturdays, 8:00–9:00 PM"
- `safetyROI` — count attendees with `departure_transport_mode` not null
- `transitLatency` — avg minutes between `rally_ended` and `rally_home_opened` analytics events per event
- `avgDwellTime` — fetch `venue_presence`, compute `avg(last_seen_at - entered_at)` in minutes

**Admin filtering**: Already queries `user_roles` — enhanced to also exclude `rally@bravoboyz.com` explicitly and filter on ALL roles (not just `admin`).

### 2. `src/components/admin/KFactorCard.tsx` — NEW
Single card showing K-Factor value (e.g. "1.3x"), subtitle "invites per rally created". Same Card/CardHeader/CardContent pattern.

### 3. `src/components/admin/SquadInsights.tsx` — NEW
Two side-by-side cards:
- **Average Squad Size**: attendees/events count
- **Prime Brand Engagement Window**: "Saturdays, 8:00–9:00 PM" — the 60-min window before peak rally starts

### 4. `src/components/admin/SafetyROI.tsx` — NEW
Card showing estimated safe departures (transport mode set) and transit latency (avg minutes).

### 5. `src/components/admin/AdminDateFilter.tsx` — NEW
Row of pill buttons: Today, 7D, 30D, All. State managed in AdminDashboard, passed to `useAdminAnalytics`.

### 6. `src/components/admin/AdminCSVExport.tsx` — NEW
Button that generates a **detailed row-by-row CSV**:
- Columns: `Event Name (Masked)`, `City`, `Total Attendees`, `% Safety Confirmed`, `Transit Provider Used`
- Event names masked as "R@lly #1", "R@lly #2", etc.
- Downloads via `URL.createObjectURL`

### 7. `src/components/admin/CommercialDashboard.tsx` — Add dwell time card
- Accept `avgDwellTime` prop
- New "Avg Dwell Time" card using identical Card styling as GMV card (same padding, shadows, borders)
- Enhanced city density bars with proportional widths

### 8. `src/pages/AdminDashboard.tsx` — Reorder + wire up
- Import all 5 new components
- Add `dateRange` state, pass to `useAdminAnalytics`
- Render `AdminDateFilter` below header
- **Partner tab order**: KFactorCard → AnalyticsCards → RetentionMetrics → SquadInsights + SafetyROI → Growth + Safety → Founder + Feedback → CSV Export
- **Commercial tab**: pass `avgDwellTime`, add CSV Export

