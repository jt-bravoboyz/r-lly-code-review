# R@lly Home: 4 Mini-Tabs

Restructure the R@lly Home tab inside a R@lly into four mini-tabs — Plan, Location, Rides, Status — matching the mockup. No backend changes; this is a reorganization of existing components plus a few new presentational cards.

## Mini-tab bar

A segmented sub-tab row directly under the R@lly Home tab: `Plan · Location · Rides · Status`, each with its icon, active state underlined in R@lly Orange, glass surface, 44px touch targets, horizontally scroll-safe on small screens. Default tab: Plan (Status when the R@lly is in After R@lly / wrapping up).

## 1. Plan

- **Your Plan Tonight** card — existing `RallyHomeButton` / `RidePlanCard` state, styled as the mockup's chevron row ("You've got a plan" vs. "No plan yet").
- **Current R@lly Point** card — venue name + address, Live badge, `Directions` and `Share Location` buttons (existing `openDirections` + native share facades).
- **Ride Options** — existing `RideshareDeepLinkButtons` (Uber / Lyft).
- **Request a Ride** (primary orange) and **Sign Up as DD** (purple) — same actions as today's `RequestRideDialog` and `DDVolunteerButton`.

## 2. Location

- **Squad Locations** map — existing `AttendeeMap` with live pins, "Live" indicator, recenter control.
- **Share My Location** toggle row — driven by the existing tracking toggle logic inside `LiveTracking`.
- **Sharing roster** — attendee rows with avatar, name, last-known area, and a `Sharing` / `Not Sharing` dot.
- **Invite to Squad** row at the bottom, linking to the existing invite dialog.
- Bar hop stops map stays here when the R@lly is a bar hop.

## 3. Rides

- **Need a Ride?** card with the orange `Request a Ride` action.
- **Become a Designated Driver** purple card with `Sign Up as DD`.
- **Who Needs a Ride Home (N)** — existing `RiderLine` data rendered as compact avatar chips, collapsible.
- **DD Assignment** — one row per DD car: driver, seat count, `x / y` filled, current passengers as chips, and `+ Add Rider` slots (existing `AddPassengerDialog` / `MyPassengersList` logic). DD-only controls (`DDArrivedButton`, `DDDropoffButton`) appear here for drivers.
- Existing DD request banner stays at the top of this tab.

## 4. Status

Built to match the mockup exactly:

- **Everyone's Status** header card with shield icon and a 5-cell counter strip: Total · Home Safe · On the Way · Hasn't Left · Didn't Participate.
- **R@lly Home Command** — 2x2 tile grid: Arrived Safely (green), On the Way Home (orange), Hasn't Left (yellow), Didn't Participate (neutral), each with count and icon.
- **Squad Roster** — per-person rows: avatar, name, status label in the status color, timestamp, and status icon.
- Host/co-host `HostSafetyDashboard` and the complete-R@lly action remain at the bottom of this tab.

## Technical notes

- New `src/components/home/rallyhome/` folder: `RallyHomeTabs.tsx` (mini-tab shell) plus `PlanTab.tsx`, `LocationTab.tsx`, `RidesTab.tsx`, `StatusTab.tsx`, and small presentational pieces (`StatusCounterStrip`, `CommandTile`, `SquadRosterRow`, `DDCarRow`, `SharingRosterRow`).
- `EventDetail.tsx` R@lly Home `TabsContent` shrinks to `<RallyHomeTabs ... />` with the event/props it already passes down; all current child components are moved, not rewritten.
- Status counts derive from the existing `useEventSafetyStatus` + `getSafetyStatus()` helper so the tiles, strip, and roster stay consistent with current rules (DD priority over not-participating).
- Colors use existing semantic tokens and the event theme's `readableAccent`; no hardcoded palette outside the status green/yellow tokens already defined.
- Bottom app nav is unchanged — the mockup's nav bar is illustrative only.
