

# Final Audit Remediation — 4 GO Fixes

## Fix 1: Admin Data SELECT Queries (`src/hooks/useAdminData.tsx`)

**Lines 54-57**: Add `cover_charge` and `location_name` to events SELECT:
```
.select('id, created_at, status, creator_id, cover_charge, location_name')
```

**Lines 59-62**: Add transit columns to event_attendees SELECT:
```
.select('id, event_id, profile_id, arrived_safely, is_dd, going_home_at, not_participating_rally_home_confirmed, status, arrival_transport_mode, departure_transport_mode, departure_provider')
```

Remove `as any` casts on lines 175-182 and 196-198 since columns are now explicitly selected.

---

## Fix 2: Home Address Geolocation (`src/pages/Profile.tsx`)

**Lines 158-161**: Update the profile update call to include coordinates:
```typescript
.update({
  home_address: location.address,
  home_lat: location.lat,
  home_lng: location.lng,
})
```

The `LocationSearch` component already provides `lat` and `lng` in its callback — they're just not being saved.

---

## Fix 3: Analytics Gap (`src/components/rides/RideshareDrawer.tsx`)

Add `import { trackEvent } from '@/lib/analytics';` and insert a `trackEvent('rideshare_selected', { provider })` call inside `handleProviderClick`, right after the DB update succeeds (line 54).

---

## Fix 4: forwardRef Warnings

The console logs show the actual warnings are on **`FounderPanel`** and **`FeedbackPanel`** (not LiveActivityFeed/FeatureFlags). Something in the rendering pipeline is passing refs to these function components.

Fix: Wrap `FounderPanel` and `FeedbackPanel` exports in `React.forwardRef` so they accept (and ignore) refs without warnings.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAdminData.tsx` | Add missing columns to SELECT queries, remove `as any` casts |
| `src/pages/Profile.tsx` | Add `home_lat`, `home_lng` to profile update |
| `src/components/rides/RideshareDrawer.tsx` | Add `trackEvent('rideshare_selected')` |
| `src/components/admin/FounderPanel.tsx` | Wrap in `forwardRef` |
| `src/components/admin/FeedbackPanel.tsx` | Wrap in `forwardRef` |

5 files, all surgical edits. No UI or lifecycle changes.

