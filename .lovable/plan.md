## Add temporary diagnostic logs to Replay Briefing

In `src/components/tutorial/TutorialOverlay.tsx`, replace the existing `handleReplayBriefing` function with a logged version so we can trace what fires when the user taps **Replay Briefing** on the Step 9 graduation screen.

### Change

Replace `handleReplayBriefing` with:

```ts
const handleReplayBriefing = () => {
  console.log('[Replay] 1. Button tapped');
  endTutorial();
  console.log('[Replay] 2. endTutorial called');
  setTimeout(() => {
    console.log('[Replay] 3. setTimeout fired — calling startTutorial');
    startTutorial();
    console.log('[Replay] 4. startTutorial finished');
  }, 350);
};
```

Nothing else in the file changes. These logs are temporary — once we see the output and diagnose the issue, we'll strip them back out.

### Next step (you)

Open preview → DevTools → Console → trigger walkthrough → advance to Step 9 → tap **Replay Briefing** → paste the `[Replay]` lines back to me.
