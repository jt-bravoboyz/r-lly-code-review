

# Updated New User Walkthrough v2 — Smooth + On-Brand

## Summary

Content-only update to the `TUTORIAL_STEPS` array in `src/hooks/useTutorial.tsx`. Replaces the current 9-step walkthrough with a refined 12-step version that is warmer, clearer, and covers all current features including R@lly Home safety, live tracking, Profile setup, and Alerts navigation.

No changes to `TutorialProvider` logic, persistence, overlay rendering, navigation targeting, or data attributes.

---

## File Change

### `src/hooks/useTutorial.tsx` (lines 19-103)

Replace the `TUTORIAL_STEPS` array with the 12-step version below:

| # | ID | Title | Action Type | Target |
|---|-----|-------|------------|--------|
| 1 | welcome | WELCOME TO R@LLY | complete (center) | -- |
| 2 | nav-intro | YOUR COMMAND CENTER | navigate (top) | nav-home -> / |
| 3 | events-intro | PLAN THE MISSION | navigate (top) | nav-events -> /events |
| 4 | quick-rally | QUICK R@LLY | complete (center) | -- |
| 5 | squads-intro | BUILD YOUR SQUAD | navigate (top) | nav-squads -> /squads |
| 6 | rides-intro | RIDE COORDINATION | complete (center) | -- |
| 7 | safety-intro | R@LLY HOME | complete (center) | -- |
| 8 | live-tracking-intro | LIVE STATUS | complete (center) | -- |
| 9 | alerts-intro | ALERTS | navigate (top) | nav-notifications -> /notifications |
| 10 | profile-intro | YOUR PROFILE | navigate (top) | nav-profile -> /profile |
| 11 | badges-intro | EARN YOUR STRIPES | complete (center) | CTA: View Badges -> /achievements |
| 12 | graduation | TRAINING COMPLETE | complete (center) | -- |

### Key differences from current version

- **welcome**: Softer tone -- explains what R@lly is and why it matters, instead of "ATTENTION, RECRUIT!"
- **nav-intro**: Changed from `tap` to `navigate` action targeting nav-home with route `/`. Lists all 5 tabs by name and function.
- **rides-intro**: Changed from `navigate` (redundantly going to Events again) to `complete` -- now explains rides live inside events with bullet points.
- **safety-intro** (new): Introduces R@lly Home safety dashboard -- the core differentiator.
- **live-tracking-intro** (new): Explains real-time status sharing during events.
- **alerts-intro** (new): Navigate action to Alerts tab, replacing the old static "notifications" step.
- **profile-intro** (new): Navigate action to Profile tab, explains home address for safety features.
- **graduation**: Cleaner sign-off with action verbs.

### What stays the same

- `TutorialProvider` context, state management, and persistence logic (lines 104-219) -- untouched
- `TutorialOverlay.tsx` -- already handles all action types generically, no changes needed
- `BottomNav.tsx` -- already has `data-tutorial` attributes for all 5 tabs (`nav-home`, `nav-events`, `nav-notifications`, `nav-squads`, `nav-profile`)
- Progress indicator already exists in `TutorialOverlay.tsx` (shows "STEP X/Y" and a progress bar)

### Progress indicator

The existing overlay already shows `STEP {n}/{total}` and a progress bar. With the new 12-step array, this will automatically read "STEP 3 of 12" etc. No additional work needed.

