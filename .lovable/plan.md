# Fix: Restart Walkthrough closes immediately after starting

## What's broken

Tapping **Restart Walkthrough** on `/profile` momentarily shows Step 1 then dismisses. Root cause is a race between three things firing on the same click:

1. `navigate('/')` — unmounts `/profile`, mounts `Index`, which can briefly flash `AuthLoadingState` and re-evaluate auth/profile.
2. `setTimeout(startTutorial, 300)` — fires from a closure created on the now-unmounted page.
3. The auto-start `useEffect` inside `useTutorial` re-runs when `profile` updates after the route change. It only ever calls `startTutorial`, but combined with the timeout it makes the start point unpredictable, and `walkthrough_completed` is still `true` in the DB so the device flag is the only thing protecting us — and we just cleared it.

The result: the modal appears for a frame, gets covered by Index's loading state, and the user perceives it as "clicking off."

## Fix

### 1. `src/pages/Profile.tsx` — Restart Walkthrough button (around line 593)

Reorder the operations so the tutorial state is set **before** navigation, and let `TutorialOverlay` ride along through the route change (it lives above `Routes`, so it survives):

```tsx
onClick={() => {
  // Clear device + DB completion flags so auto-start logic won't fight us
  localStorage.removeItem('rally-tutorial-complete');
  localStorage.removeItem('rally-walkthrough-seen');
  if (user) {
    supabase.from('profiles')
      .update({ walkthrough_completed: false } as any)
      .eq('user_id', user.id)
      .then();
  }
  // Start FIRST so the overlay is already mounted before the route flips
  startTutorial();
  // Then navigate home on the next tick so React commits the active state first
  requestAnimationFrame(() => navigate('/'));
}}
```

(Existing `supabase` and `user` imports are already in Profile.tsx via `useAuth`.)

### 2. `src/pages/Settings.tsx` — mirror the same fix on the Settings restart entry (around line 834)

Same pattern: clear localStorage + DB flag, `startTutorial()`, then `requestAnimationFrame(() => navigate('/'))`.

### 3. `src/hooks/useTutorial.tsx` — make `startTutorial` self-defending

Update `startTutorial` so a manual restart can't be silently suppressed:

```ts
const startTutorial = useCallback(() => {
  localStorage.removeItem('rally-tutorial-complete');
  localStorage.removeItem('rally-walkthrough-seen');
  setCurrentStepIndex(0);
  setIsActive(true);
}, []);
```

This means future callers (and the existing two) don't have to remember to clear flags, and there's no window where the auto-start guard could re-fire and short-circuit.

## Verification

- Tap **Restart Walkthrough** from `/profile` → Step 1 (`WELCOME TO R@LLY`) appears and stays until **CONTINUE** is tapped.
- Tap **Restart Walkthrough** from `/settings` → same behavior.
- Walk through all 9 steps end-to-end without the modal disappearing between route changes (Step 5 `/tabs` transition still works).
- After completing Step 9, `LET'S R@LLY` closes cleanly and the **Replay Briefing** button restarts from Step 1 without flicker.
- No new TypeScript or console errors.
