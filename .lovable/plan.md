Update the `.rally-scan-hero` CSS rule in `src/index.css` to make the Create Event button render at full brightness during Step 3 of the walkthrough.

Current state of the rule (lines 2353-2367):
- `z-index: 60`
- `opacity: 1 !important`
- `transform: scale(1.06) translateY(-4px)`
- Complex `filter` with multiple drop-shadows
- `animation: rallyHeroBreath 1800ms ease-in-out infinite`

The backdrop overlay (`rally-backdrop-deep` at line 2418) applies `bg-black/88` but does not carry its own z-index — the spotlight mechanism in TutorialOverlay.tsx creates the cutout separately.

The issue is that the Create Event card’s content (white background, + icon, text) is dimmed despite the `rally-scan-hero` class being applied. The current rule only forces `opacity: 1` on the root element, but parent opacity/filter rules or stacking context issues can still suppress child visibility.

**Change:**

Replace the `.rally-scan-hero` ruleset (lines 2353-2367) with:

```css
.rally-scan-hero {
  position: relative;
  z-index: 70;
  opacity: 1 !important;
  isolation: isolate;
  filter: drop-shadow(0 0 24px rgba(244, 122, 25, 0.85))
          drop-shadow(0 0 48px rgba(244, 122, 25, 0.45));
  animation: rallyHeroBreath 1800ms ease-in-out infinite;
  transition: all 400ms ease-out;
}

.rally-scan-hero,
.rally-scan-hero * {
  opacity: 1 !important;
  visibility: visible !important;
}

.rally-scan-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
}
```

**What must NOT change:**

- `.rally-scan-hero::before` (the halo pseudo-element) stays untouched.
- `@keyframes rallyHeroBreath` and `@keyframes rallyHeroHalo` stay untouched.
- `.rally-backdrop-deep` stays untouched.
- The 1800ms breathing cycle stays unchanged.
- `TutorialOverlay.tsx`, `useTutorial.tsx`, the Create Event button component, Profile.tsx, Settings.tsx, and the bottom nav component are not modified.
- No new packages installed. No console logs added.

**Acceptance:**

- On Step 3, the Create Event card renders fully bright — white background, + icon, and text are fully readable.
- The orange breathing halo continues its 1800ms cycle around the card.
- The rest of the page remains dimmed by the deep backdrop.
- Continue to Step 4 cleans up styling cleanly.
- Step 2 nav scan works with no regressions.
- The adjacent Quick R@lly card stays dimmed and untouched.
- No TypeScript or console errors.