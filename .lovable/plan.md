## Plan

1. **Fix Step 3 target visibility**
   - Stop using the generic target scroll behavior for the create-rally step, because centering the target puts the Create Event card behind the walkthrough modal.
   - Keep Home scrolled to the top for Step 3 so the Create Event card stays in the first visible action row.

2. **Move the Step 3 modal out of the target’s way**
   - Add a Step 3-specific compact bottom coach card style so it sits lower and takes less vertical space on mobile.
   - Keep the modal above the bottom nav, but reduce its height enough that the Create Event card remains visibly highlighted.

3. **Make the real Create Event card visually break through the dark overlay**
   - Keep the saturated lifted hero glow already added.
   - Ensure the spotlight/cutout sits above the dark backdrop and is not visually swallowed by the modal.

4. **Preserve other walkthrough steps**
   - Leave Step 2’s bottom nav scan unchanged.
   - Leave Steps 4, 5, 6, 7, and 8 unchanged.
   - Keep Step 7’s SafetyDashboardPreview intact.

## Technical details

- Update only `src/components/tutorial/TutorialOverlay.tsx` and, if needed, the existing Step 3 CSS in `src/index.css`.
- Use `currentStep.id === 'create-rally'` to scope all behavior.
- No backend changes, no routing changes, no new components.