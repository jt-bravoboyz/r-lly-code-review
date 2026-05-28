## Problem

The `profile-intro` tutorial step targets `[data-tutorial="nav-profile"]`, but that element was removed when the bottom nav was restructured (now: Home, R@lly, Alerts, Wallet, Squads — no Profile tab). Profile is only reachable via the avatar in the header (top-left). With no element matching the selector, the highlight cutout never renders and the step never completes — users are stuck until they hit "Skip Training".

## Fix

1. **`src/components/layout/Header.tsx`** — Add `data-tutorial="nav-profile"` to the `<Link to="/profile">` avatar element so the tutorial highlight has something to anchor to.

2. **`src/hooks/useTutorial.tsx`** — In the `profile-intro` step:
   - Change `position` from `'top'` to `'bottom'` so the command card doesn't cover the header avatar it's pointing at.
   - Update the instruction line from "Tap Profile." to "Tap your avatar in the top-left." so the cue matches the new location.

3. **Safety net** — In `src/components/tutorial/TutorialOverlay.tsx`, when a step has a `targetSelector` but no element is found after a short delay (e.g. 2s), render a fallback **"Skip this step"** / **"Continue"** button on the command card so a missing/renamed selector can never trap users again. (Today there's no recovery — only the global Skip Training.)

No other steps need changes; all other `data-tutorial` selectors (`nav-home`, `nav-events`, `nav-squads`, `nav-notifications`) still exist in `BottomNav.tsx`.

## Out of scope

- Re-adding a Profile tab to the bottom nav (would conflict with the current 5-tab layout that includes Wallet).
- Rewriting the tutorial flow itself.
