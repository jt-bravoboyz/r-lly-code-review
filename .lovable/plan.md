## Problem

The walkthrough auto-resets to Step 1 ("Orientation Brief") a few seconds in. Root cause is in `src/hooks/useTutorial.tsx`:

The auto-start effect (lines 218–251) gates on `profile`, `authLoading`, `walkthrough_completed`, name setup, the `SEEN`/`COMPLETE` localStorage keys, and profile age — but **not** on `isActive`. When the tutorial starts, `startTutorial()` clears `TUTORIAL_COMPLETE_KEY` and `TUTORIAL_SEEN_KEY`, so none of those checks block re-entry.

As soon as the `profile` object reference changes mid-tutorial (auth refresh, realtime update, refocus — typically within ~5s of starting), this effect re-runs, all guards pass, and it schedules `startTutorial()` again after 1200ms. That call resets `currentStepIndex` to 0, snapping the user back to the Orientation Brief.

## Fix

In `src/hooks/useTutorial.tsx`, add two early-return guards at the top of the auto-start effect (the one starting at line 218):

1. `if (isActive) return;` — never re-trigger while a tutorial is already running.
2. `if (sessionStorage.getItem(TUTORIAL_PENDING_START_KEY) === 'true') return;` — don't double-schedule when a start is already pending/in-flight.

Also add `isActive` to that effect's dependency array so it correctly re-evaluates when the tutorial ends.

No other files change. Behavior for first-time auto-start, manual replay from Profile, and skip/complete remain identical — the only change is that an in-progress walkthrough can no longer be clobbered by a profile re-fetch.

## Verification

- Start walkthrough, sit on Step 1 for 10+ seconds → stays on Step 1, does not reset.
- Advance to Step 5, wait 10s → stays on Step 5.
- Skip tutorial → does not auto-restart.
- Fresh new-signup flow → still auto-starts once after profile loads.
- Replay Briefing from Profile → still works end-to-end.
