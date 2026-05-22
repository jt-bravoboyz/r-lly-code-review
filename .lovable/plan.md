# Native Polish Audit — Suggested Cleanups

Quick scan of the codebase against your native-iOS rules. Nothing here is broken — these are the rough edges most likely to read as "web app" on a phone.

## High value

### 1. Maps links still hardcode `https://www.google.com/maps/...`
You have a `nativeLinks` facade and a Mapbox-only policy, but ~14 components still build raw Google Maps URLs. Many do pass them through `openDirections`/`openProtocolLink`, but a few don't:

- `src/components/tracking/LiveTracking.tsx:107-111` — builds Google Maps URL, opens directly (no facade).
- `src/components/tracking/AttendeeMap.tsx:100-103` — same.
- `src/components/rides/RideshareDrawer.tsx:89-90` — branches on iOS via `navigator.userAgent` instead of `Capacitor.getPlatform()`.

On iOS native, a `https://maps.google.com/...` link in a webview can pop the in-app browser instead of Apple Maps. Suggest: one `openMapsDirections({ lat, lng, label })` helper in `nativeLinks` that emits `maps://` on iOS native, `geo:` on Android native, and the existing Google URL on web. All 14 call sites then collapse to one line.

### 2. SMS / mailto deep links use `window.location.href`
`AddPeopleSheet.tsx` (4 spots) and `ContactInviteDialog.tsx` (3 spots) still do `window.location.href = 'sms:...'`. On iOS WKWebView this can blank the page momentarily and the back-swipe gets weird. `nativeLinks.openProtocolLink` already exists — route every `sms:` / `mailto:` through it for consistent behavior.

### 3. Fixed overlays missing safe-area padding
Most of your overlays use `fixed inset-0` without `safe-top`/`safe-bottom`. On iPhones with a notch/Dynamic Island the close button or top header lands under the status bar:

- `RogueAlertOverlay.tsx`
- `RallyCompleteOverlay.tsx`
- `RallyHeroMediaCarousel.tsx` (full-screen viewer)
- `ImageLightbox.tsx`
- `TurnByTurnNav.tsx` (3 fixed overlays)
- `FindFriendView.tsx`
- `RallyInviteBanner.tsx`, `RallyRidesBanner.tsx`, `LocationSharingBanner.tsx`
- `ConnectionStatusBanner.tsx` — `fixed top-0` with no `pt-safe`, so on iPhone it overlaps the clock.

`EventPhotoFeed.tsx` already uses `safe-top safe-bottom` — that's the pattern to copy everywhere.

### 4. `min-h-screen` on `NotFound.tsx`
You enforce `100dvh` in your Core memory but `src/pages/NotFound.tsx:12` still uses `min-h-screen`. On iOS Safari/WKWebView this gets cut off by the bottom bar. Swap to `min-h-[100dvh]`.

### 5. `ReturningAuth.tsx:624` uses `window.location.href = '/'`
Full-page nav inside a Capacitor app reloads the bundle. Should be `navigate('/')` from `react-router-dom`.

## Medium value

### 6. iOS detection via `navigator.userAgent`
Multiple places (`AddPeopleSheet`, `ContactInviteDialog`, `ContactsTab`, `RideshareDrawer`) check `/iPad|iPhone|iPod/.test(navigator.userAgent)` to pick `?` vs `&` for SMS. This works on web, but inside Capacitor on iOS the UA is also "iPhone" — fine here, but the pattern is fragile and duplicated 6+ times. Centralize as `buildSmsUrl(to, body)` in `nativeLinks.ts`.

### 7. Native splash + status bar style
You added `WelcomeBackOverlay` — good. Two follow-ups:
- `capacitor.config.ts` should set `StatusBar.style = 'light'` (or match your light-mode default) so the iOS clock isn't invisible during the orange splash.
- Configure Capacitor's native `SplashScreen` plugin so the brief flash before React mounts is also branded R@lly orange, not the default white.

### 8. Pull-to-refresh / bounce scrolling
Capacitor iOS lets the whole webview rubber-band, which on full-screen overlays (recap, lightbox, turn-by-turn) exposes the white app background. Add `overscroll-behavior: none` on `html, body` in `index.css` and `-webkit-overflow-scrolling: touch` only on scroll containers.

### 9. Haptics coverage
You have `useHaptics` but only 1 reference. Native apps "feel" right when primary CTAs buzz. Suggest hooking it into: split-pay confirm, R@lly Home arrived, friend-request accept, DD arrival, tier-up celebration.

### 10. Back-swipe / hardware back button
No `@capacitor/app` `backButton` listener exists. On Android the hardware back button currently exits the app instead of popping the router. One global listener in `NativeBootstrap.ts` that calls `navigate(-1)` (or closes the top sheet/dialog) fixes it.

## Low value / polish

### 11. Long-press text selection
Add `user-select: none` to non-text UI surfaces (chat bubbles excepted) so long-pressing a card on iOS doesn't show the copy/share callout.

### 12. Tap highlight color
`-webkit-tap-highlight-color: transparent` is missing globally. You'll see the default iOS gray flash on every button tap.

### 13. Disable iOS form zoom
Inputs with `font-size < 16px` cause iOS to zoom the viewport on focus. Quick global rule: `input, textarea, select { font-size: max(16px, 1em); }`.

### 14. `AddPeopleSheet` `handleQuickAdd` always calls share
Line 76 reads `if ((true /* shareContent */))` — dead conditional left over from a refactor. The phone-number SMS branch never runs because the truthy literal short-circuits. Worth cleaning up; same dead branch is in `ContactInviteDialog.tsx:113` and `:141`.

## What I'd tackle first

If you only do three: **#1 (maps facade)**, **#3 (safe-area on overlays)**, and **#5 + #14 (router nav + dead `if (true)` branches)**. Those collectively kill the "this is a webview" tells without much surface change.

Want me to implement any of these? I can take them as one combined pass or split into batches (e.g. all-maps, all-safe-area, etc.).
