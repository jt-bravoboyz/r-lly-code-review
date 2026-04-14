

# Plan: Fix Tutorial Navigation Timing

## Problem

When the tutorial auto-starts for new users, it fires 500ms after auth completes — but the user may still be on `/auth` or another route. The tutorial overlay renders on top of whatever screen is showing, resulting in the tutorial appearing over a blank/login screen instead of the Home screen.

## Fix

In `src/hooks/useTutorial.tsx`, modify the auto-start effect (lines 217-243) to:

1. Check if the user is currently on the Home route (`/`)
2. If not, navigate to `/` first
3. Wait for the Home screen to render (longer delay), then start the tutorial

### File: `src/hooks/useTutorial.tsx`

In the auto-start `useEffect` (line 237-242), replace the simple 500ms timeout with:

```tsx
// Navigate to home first if not already there
if (window.location.pathname !== '/') {
  navigate('/');
}
// Give the home screen time to fully render
const timer = setTimeout(() => {
  startTutorial();
}, 1200);
return () => clearTimeout(timer);
```

This requires importing `useNavigate` (already imported on line 2) and using the existing `navigate` reference. However, `navigate` is currently only created inside the `TutorialProvider` component — the auto-start effect already has access to it.

Move the `navigate` call into the effect block so it navigates to Home before starting the tutorial. The 1200ms delay gives the Home screen enough time to mount and render its content behind the overlay.

### No other changes
- Tutorial steps, content, order, skip logic — all unchanged
- Only the auto-start timing and navigation are affected

