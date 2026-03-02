

# Add Safety Feature Preview to Tutorial

## Overview

Add inline visual mockups to the safety-related tutorial steps (`safety-intro` and `live-tracking-intro`) so new users can *see* what these features look like before they ever use them. This is a UI-only enhancement to the `TutorialOverlay` component.

## Approach

### 1. Extend the TutorialStep type with an optional `illustration` field

**File:** `src/hooks/useTutorial.tsx`

Add an optional `illustration` property to the `TutorialStep` interface:
```
illustration?: 'safety-dashboard' | 'live-status';
```

Then set `illustration: 'safety-dashboard'` on the `safety-intro` step and `illustration: 'live-status'` on the `live-tracking-intro` step.

### 2. Build inline mini-mockups in the TutorialOverlay

**File:** `src/components/tutorial/TutorialOverlay.tsx`

Add two small illustrative components rendered inside the command card, between the instruction text and the CONTINUE button:

**Safety Dashboard Preview** (`safety-dashboard`):
- A compact card showing 3 mock attendees with status badges:
  - "Alex" with a green "Arrived Safely" badge
  - "Jordan" with an orange "En Route" badge  
  - "Sam" with a blue "Opted In" badge
- Uses the same color tokens as the real `HostSafetyDashboard` (green-100/700, orange-100/700, blue-100/700)
- Small header: "Host Safety Dashboard"

**Live Status Preview** (`live-status`):
- A compact card showing 3 status rows:
  - Green dot + "3 Arrived"
  - Orange dot + "2 En Route"
  - Blue dot + "1 Still Out"
- Mimics the real-time feel with a subtle pulse animation on the "En Route" dot

Both mockups are purely visual (no real data), styled to fit within the dark tutorial card, and kept compact (roughly 120px tall) so they don't push the CONTINUE button off-screen on small devices.

### 3. No other file changes needed

- `useTutorial.tsx` provider logic is untouched
- No database changes
- No new dependencies

## Technical Details

The mockups use existing UI primitives (`Badge`, `Avatar`) and Tailwind classes already present in the project. They render conditionally based on `currentStep.illustration` in the overlay's command card JSX, placed between the instruction `<p>` and the action `<Button>`.

