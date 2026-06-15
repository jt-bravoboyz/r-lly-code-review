## Restart Walkthrough Button

Add a "Restart Walkthrough" row button directly under the "View all badges & rewards" link on `/profile`.

### What to build
- New clickable row in `src/pages/Profile.tsx`, placed immediately after the "View all badges & rewards" `<button>` block (line ~588).
- Uses the same row styling as the badges link: `w-full flex items-center justify-between py-3 px-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors`.
- Icon: `RotateCcw` from `lucide-react`, colored `text-primary`, sized `h-5 w-5`.
- Label: "Restart Walkthrough".
- ChevronRight on the right, `text-muted-foreground`.
- On click: call `startTutorial()` from `useTutorial()` (already imported/provider-wrapped), then navigate to home (`/`) so the walkthrough can run from the beginning. This resets the tutorial state (currentStepIndex = 0, isActive = true) and clears any local completion flags as needed.

### Files changed
- `src/pages/Profile.tsx` — add row + import `RotateCcw`, add `startTutorial` from `useTutorial()`, and wire click handler.

No other files needed. The `useTutorial` hook already exposes `startTutorial` which resets step index and activates the overlay. The existing `TutorialOverlay` and `TutorialProvider` handle the rest.