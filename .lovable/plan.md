

# Phase 7: Commercial & Transit Integration — Implementation Plan

## Database Migrations (2 migrations)

### Migration A: event_attendees transport columns
Add `arrival_transport_mode`, `departure_transport_mode`, `in_transit_rideshare_at`, and `departure_provider` text columns to `event_attendees`.

### Migration B: events commercial columns
Add `cover_charge` (numeric, default 0) and `split_check` (boolean, default false) to `events`.

---

## New Files (5)

### 1. `src/components/events/TransportModeSelector.tsx`
Modal shown after successful join. Five icon buttons: DD, Rideshare, Walking, Driving, Public Transit. On selection, writes `arrival_transport_mode` to `event_attendees` via Supabase update. Dismissable.

### 2. `src/components/rides/RideshareDrawer.tsx`
Vaul Drawer with three branded buttons:
- **Uber**: `https://m.uber.com/looking?dropoff[latitude]={lat}&dropoff[longitude]={lng}`
- **Lyft**: `lyft://ridetype?id=lyft&destination[latitude]={lat}&destination[longitude]={lng}`
- **Public Transit**: Google Maps (`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=transit`) or Apple Maps on iOS

On click: (1) write `departure_provider`, `departure_transport_mode`, and `in_transit_rideshare_at = now()` to DB, (2) THEN open the link. Status is factual — only triggers after provider is opened.

Uses device-aware navigation pattern (memory): `window.location.href` on mobile, `window.open` on desktop.

### 3. `src/lib/paymentService.ts`
`simulatePayment(amount: number, shouldFail: boolean)` — returns Promise resolving after 2 seconds with `{ status: 'paid' | 'failed', transactionId }`. The `shouldFail` param enables testing the error path.

### 4. `src/components/events/PaymentGateDialog.tsx`
Dialog showing cover charge amount. Contains:
- "Pay to Join" button → triggers 2-second "Processing..." spinner
- "Simulate Failure" toggle (Switch component) for testing
- On success: closes dialog, proceeds with join flow
- On failure: shows error with "Try Again" button

### 5. `src/components/admin/CommercialDashboard.tsx`
Three metric sections:
- **Total Revenue (GMV)**: sum of `cover_charge` for completed events
- **Provider Split**: departure_provider counts (Uber vs Lyft vs Public Transit)
- **Event Density by City**: group events by `location_name`
Uses AdminEmptyState for zero-data sections.

---

## Edited Files (6)

### `src/pages/EventDetail.tsx`
- Import TransportModeSelector, PaymentGateDialog, RideshareDrawer
- Add state: `showTransportSelector`, `showPaymentGate`, `showRideshareDrawer`
- **Join flow**: if `event.cover_charge > 0`, show PaymentGateDialog first → on success call `handleJoin` → on join success show TransportModeSelector. If no cover charge, existing flow + TransportModeSelector after join.
- **Privacy**: when joining paid event, set `share_location = false` on attendee record (signal-only mode)
- Add RideshareDrawer trigger in after_rally section alongside Rally Home actions

### `src/components/events/CreateEventDialog.tsx`
- Add `cover_charge` (number input) and `split_check` (Switch) inside the existing Collapsible "Optional details" section
- Update Zod schema with optional `cover_charge` and `split_check`
- Pass values through to create mutation

### `src/components/home/HostSafetyDashboard.tsx`
- Query `event_attendees` for `arrival_transport_mode` grouped counts
- Render compact icon summary bar (🚗 3 | 🚕 2 | 🚶 1 | 🚇 1)
- Add "Request a Ride" button for attendees in after_rally state → opens RideshareDrawer

### `src/pages/AdminDashboard.tsx`
- Expand `ViewMode` to `'partner' | 'technical' | 'commercial'`
- Add third pill to toggle
- Render CommercialDashboard in commercial view

### `src/hooks/useAdminData.tsx`
- Add commercial metrics: `totalGMV`, `paidEventsCount`, `eventsByCity`
- Add transit metrics: `arrivalModeCounts`, `departureModeCounts`, `providerSplit` (with provider-level granularity for Uber/Lyft/Public Transit)
- Add transit aggregation panel data to Technical view
- Admin email filtering applies to all new metrics

### `src/pages/Profile.tsx`
- Add "Payments" card after existing sections with credit card icon and "Founder 25: Coming Soon" text

---

## Summary

2 migrations, 5 new files, 6 edited files. No changes to existing user-facing lifecycle logic — all additions are additive. Transit status updates are factual (only on provider click). Payment gate includes 2s spinner and failure toggle for friction testing.

