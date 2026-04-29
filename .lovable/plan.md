## What's wrong

On iPhone — both in Safari and when added to the Home Screen — the very top of some screens slides under the notch / status bar. A few screens do it right (Home, Events, Notifications, Profile all use a tiny `env(safe-area-inset-top)` spacer in their headers), but several do not. The result: the top of the page (page title, back button, logo) gets clipped or hidden behind the iPhone status bar.

The root cause is two-fold:
1. The app declares `apple-mobile-web-app-status-bar-style = black-translucent` and `viewport-fit=cover`. That tells iOS Safari "let our content draw under the status bar" — which is correct for a premium look — but every top-level screen then has to push its own content down using the iOS-provided "safe area" inset.
2. Several pages were never given that spacer, and there is no shared utility for it, so future pages will keep making the same mistake.

## What we'll fix

Add a single, reusable safe-area system, then apply it to every screen that's missing it.

### 1. Create reusable safe-area utilities

In `src/index.css`, add small helper classes that any component can use:

- `.safe-top` — adds top padding equal to the iPhone status-bar / notch height
- `.safe-bottom` — adds bottom padding equal to the iPhone home-indicator height
- `.safe-x` — adds left/right padding for landscape notch on iPhone
- `.h-safe-top` — a fixed-height spacer element (so sticky headers can keep their colored bar visible all the way up to the very top of the screen, like the existing `<div style={{ height: 'env(safe-area-inset-top, 1.5rem) }}>` trick)

In `tailwind.config.ts`, expose the same values as `pt-safe`, `pb-safe`, `px-safe` so they're discoverable.

### 2. Patch the screens that are currently clipping

The following screens render right up against the very top edge with no inset — fix each one:

- `src/pages/Auth.tsx` — splash/sign-in page. The "R@LLY" wordmark currently uses `pt-12`, which is not enough on devices with a notch. Add `safe-top` to the outer container.
- `src/pages/ReturningAuth.tsx` — same treatment.
- `src/components/Onboarding.tsx` — the 3-slide intro. Add `safe-top` (and `safe-bottom` so the "Skip / Next" buttons clear the home indicator).
- `src/pages/AdminDashboard.tsx` — the sticky glass admin header. Insert the `<div className="h-safe-top" />` spacer at the top of the header so the glass bar extends behind the status bar instead of starting under it.
- `src/pages/SquadDetail.tsx` — same pattern: sticky header, missing spacer, back button currently sits half-under the notch.
- `src/pages/Unsubscribe.tsx` — center-aligned card that can hit the top edge on small phones; add `safe-top` to the `<main>`.
- `src/pages/JoinRally.tsx` — already uses `paddingTop: env(safe-area-inset-top)` but only on the floating top bar; double-check the main hero section gets the spacer too on small phones.

### 3. Verify the screens that are already correct

These are already using the spacer — we'll just make sure they switch to the new utility class for consistency, no behavior change:

- `src/pages/Index.tsx`, `src/pages/Events.tsx`, `src/pages/Notifications.tsx` (inline headers)
- `src/components/layout/Header.tsx` (shared header used by Profile, Squads, Chat, Settings, Achievements, Legal, Documentation, JoinSquad, InviteHistory)
- `src/components/layout/BottomNav.tsx` (already pads bottom for the home indicator — leave as is)

### 4. Bottom-edge audit (home indicator)

While we're in there, confirm every page that has a fixed bottom action bar (Profile edit save bar, EventDetail action bar, JoinRally CTA, etc.) respects `env(safe-area-inset-bottom)` so buttons aren't half-hidden behind the iPhone home indicator. Add `safe-bottom` where missing.

### 5. Manual QA

After the changes, verify on the preview at iPhone-class viewports (375x812 and 390x844) and Android-class (360x800):

```text
+------------------+   <- status bar / notch
|     SAFE TOP     |   (added padding, content never enters this band)
+------------------+
|                  |
|   page content   |
|                  |
+------------------+
|    SAFE BOTTOM   |   (home indicator, content never enters this band)
+------------------+
```

Every screen listed above should show its title / logo / back button fully visible, no overlap with the iOS status bar or home indicator.

## Files changed

- `src/index.css` — add `.safe-top`, `.safe-bottom`, `.safe-x`, `.h-safe-top` utilities
- `tailwind.config.ts` — register `pt-safe`, `pb-safe`, `px-safe` aliases
- `src/pages/Auth.tsx` — add `safe-top`
- `src/pages/ReturningAuth.tsx` — add `safe-top`
- `src/components/Onboarding.tsx` — add `safe-top` + `safe-bottom`
- `src/pages/AdminDashboard.tsx` — add `h-safe-top` spacer in sticky header
- `src/pages/SquadDetail.tsx` — add `h-safe-top` spacer in sticky header
- `src/pages/Unsubscribe.tsx` — add `safe-top` to outer `<main>`
- `src/pages/JoinRally.tsx` — verify hero section gets safe-top on small phones
- Audit pass on EventDetail / Profile fixed bottom bars for `safe-bottom`

## What stays the same

- The `viewport-fit=cover` and `apple-mobile-web-app-status-bar-style = black-translucent` settings stay — they give the app the edge-to-edge premium look you have today. We're just making sure nothing important draws into that protected band.
- No design changes, no color changes, no copy changes. Pure layout safety.
