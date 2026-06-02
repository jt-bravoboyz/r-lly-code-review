## Goal

Add a **read-only preview route** at `/demo/rally-home` that renders every visual state of the R@lly Home card stack so you can see all the renderings without needing a live event in the database.

## What you'll see on the page

Stacked, mobile-width column (max-w-md, like the real EventDetail), each state labeled with a small caption:

1. **Entry trigger card** — orange gradient "R@lly Home / Let your crew know you're heading out" (the exact card from `EventDetail.tsx` lines 957-969)
2. **After R@lly entry trigger** — same card with the glow ring + drop-shadow variant (`showAfterRallyTheme=true`)
3. **"I've Arrived Safely" button** — green full-width pill (RallyHomeButton state when `isGoingHome && !hasArrived`)
4. **"Arrived Safely ✓" disabled state** — green muted pill (when `hasArrived`)
5. **"Start Heading Home Now" state** — destination-set state with the RidePlanCard preview underneath
6. **After R@lly banner** — gradient purple banner ("After R@lly Mode / Next stop: …") from EventDetail lines 922-944
7. **SafetyTracker** card (renders as-is with a stub event id — falls back to its empty/loading state gracefully)
8. **HostSafetyDashboard** card (host view)

For states 1-6 we render **static replicas** of the JSX (no hooks, no DB) so every variant shows regardless of auth/event data. For 7-8 we mount the real components with a fake event id so you see their empty-state visuals.

## Files

- **Create** `src/pages/DemoRallyHome.tsx` — the preview page (mobile-padded, BottomNav optional, labeled sections)
- **Edit** `src/App.tsx` — add `<Route path="/demo/rally-home" element={<DemoRallyHome />} />` (lazy-loaded like the other pages)

## Out of scope

- No changes to `RallyHomeButton`, `SafetyTracker`, `HostSafetyDashboard`, `RidePlanCard`, or `EventDetail`
- No DB migrations, no auth changes
- Not linked from the nav — accessible only by typing `/demo/rally-home`. Easy to remove later.

## After build

I'll navigate the preview to `/demo/rally-home` and screenshot it so you can review all states in one shot.
