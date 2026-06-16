## Problem

Several pages (Squads, Notifications, JoinRally, JoinSquad) gate their initial render on `authLoading` from `useAuth` and show a full-screen R@lly logo splash whenever that's `true`. Because `useAuth`'s `loading` flag can flip on remount/route transitions in certain scenarios (and these pages have their own per-page loaders independent of the global one), the user sees the R@lly logo screen each time they navigate to those tabs.

`Index.tsx` already does this correctly: it gates the full-screen `AuthLoadingState` on `!hasResolvedOnce && (loading || !holdComplete)` so the cinematic loader only fires on the very first auth resolution per session.

## Fix

Apply the same pattern everywhere else. Use `hasResolvedOnce` from `useAuth` so the big R@lly logo loader is only allowed on cold start; after that, render the page immediately (no loader, no flash).

### Files to update

1. **`src/pages/Squads.tsx`**
   - Pull `hasResolvedOnce` from `useAuth()`.
   - Change `if (authLoading)` → `if (!hasResolvedOnce && authLoading)`.

2. **`src/pages/Notifications.tsx`**
   - Same change: pull `hasResolvedOnce`, gate the logo loader on `!hasResolvedOnce && authLoading`.

3. **`src/pages/JoinRally.tsx`** and **`src/pages/JoinSquad.tsx`**
   - Same treatment for any `authLoading`-gated full-screen R@lly logo block (around the `rallyLogo` usages near the loader blocks).

### Not changing

- `src/pages/Index.tsx` — already correct.
- `WelcomeBackOverlay` — once-per-session via `sessionStorage`, not per-navigation; leaving as-is.
- Headers that show the small R@lly logo inline (Header.tsx, Notifications header, etc.) — those are not the full-screen loader.
- Routing, auth logic, data fetching — untouched.

### Result

The full R@lly logo loading screen only appears on the very first auth resolution after app launch. Subsequent in-app navigation between Home, Squads, Notifications, Join pages, etc. renders the page immediately with no logo splash.
