# Native App Deep Links for Uber + Lyft

Surgical update to `src/components/rides/RideshareDeepLinkButtons.tsx`. No visual changes — same glass buttons, breathing glow, icons, layout, and placement on the Rides tab. Only the click behavior changes.

## What changes

Replace `buildUberUrl` / `buildLyftUrl` / `handleClick` with handlers that:

1. Detect platform via `navigator.userAgent` (iOS / Android / desktop).
2. Build native scheme URLs:
   - Uber: `uber://?action=setPickup&pickup=my_location&dropoff[latitude]=...&dropoff[longitude]=...&dropoff[nickname]=...&dropoff[formatted_address]=...`
   - Lyft: `lyft://ridetype?id=lyft&pickup=current&destination[latitude]=...&destination[longitude]=...`
3. **Android**: use `intent://...#Intent;scheme=...;package=...;S.browser_fallback_url=<store>;end` so the OS opens the app or falls back to the Play Store automatically.
4. **iOS / desktop**: set `window.location.href = nativeUrl`, start a 1.5s `setTimeout` that redirects to the App Store, and listen for `visibilitychange` — if the page hides (the app opened), clear the timer.
5. **Missing coords**: fire `uber://` or `lyft://` with no params; fallback logic still runs.
6. Desktop default → iOS App Store link.

## Store fallback URLs

- Uber iOS: `https://apps.apple.com/app/uber/id368677368`
- Uber Android: `https://play.google.com/store/apps/details?id=com.ubercab`
- Lyft iOS: `https://apps.apple.com/app/lyft/id529379082`
- Lyft Android: `https://play.google.com/store/apps/details?id=me.lyft.android`

## Untouched

- Glass treatment, breathing glow keyframe, app icon squircles, button text, layout, placement.
- All existing `useHaptics`, `trackEvent('rideshare_deeplink_clicked')` calls remain.
- No other files modified.
