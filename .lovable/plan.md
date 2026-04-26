## Hamilton Pass — Completion Pass

The bulk of the plan landed in the previous loop, but four loose ends remain. This pass closes them so the build is green and every section of the original plan is honored.

### 1. Fix the build (critical)

`src/pages/AdminDashboard.tsx` still imports `KFactorCard` from a file that has been deleted, breaking the whole admin route.

- Remove the `KFactorCard` import line at the top of `AdminDashboard.tsx`.
- (No JSX usage remains — only the dangling import.)

### 2. Wire `livePaidNowCount` through to the Commercial hero

`useAdminData` already computes `livePaidNowCount`, and `CommercialDashboard` already accepts the prop, but `AdminDashboard.renderCommercial` doesn't pass it. The pulsing "Live Now" chip on Revenue Potential never lights up.

- In the `<CommercialDashboard …/>` call inside `renderCommercial`, add `livePaidNowCount={data.summary.livePaidNowCount ?? 0}` (and `revenuePotential` / `avgTicket` if present on `data.commercial` for full ROI accuracy — falls back to derived if absent).

### 3. Finish the GrowthMetrics echo removal

Plan §4 says: remove `GrowthMetrics.topHosts` block (echoes `GrowthNarrative.topViralHosts`). The render block is gone, but the prop/interface still expects `topHosts`, which keeps the data flowing and tempts re-introduction.

- In `src/components/admin/GrowthMetrics.tsx`, drop `topHosts` from the `growth` prop interface. The component is now strictly a Crew Recurrence card — anything else is the narrative's job.
- Confirm no callers pass `topHosts` and the field on `data.growth` from the hook can stay (other consumers may use it; only the prop surface narrows).

### 4. RetentionCohorts — sparkline overlays

Plan §3 calls for 4-week trend sparklines as a row background on `RetentionCohorts`. Currently the file has no SVG/sparkline at all.

- Extend `src/components/admin/RetentionCohorts.tsx`: for each cohort row, render a faint absolute-positioned SVG polyline behind the bars built from that row's `returnRates` (filter nulls, normalize 0–100%). Use `stroke="hsl(var(--primary))"`, `stroke-opacity={0.18}`, `fill="none"`, `stroke-width={1.5}`. Position it `inset-0` inside the row container with `pointer-events-none` so the existing bars stay interactive and on top.
- No new file. No prop changes — uses existing `returnRates` array.

### 5. Quick verification

After the four edits:
- `/admin` loads (build green).
- Commercial → Revenue: pulsing green Live Now chip appears when any paid R@lly is currently live.
- Partner → Hosts: only `GrowthNarrative` lists top hosts; `GrowthMetrics` shows just Crew Recurrence.
- Partner → Retention: each cohort row shows a faint orange trend line behind its bars.

### Files

**Modified:**
- `src/pages/AdminDashboard.tsx` — remove dead import, pass `livePaidNowCount`.
- `src/components/admin/GrowthMetrics.tsx` — narrow prop interface.
- `src/components/admin/RetentionCohorts.tsx` — add per-row sparkline overlay.

**No deletions, no new files.**
