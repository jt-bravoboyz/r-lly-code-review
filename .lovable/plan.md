

# Fix: Bottom Nav Button Highlighting During Walkthrough

## Problem
The tutorial overlay highlights bottom nav buttons with just an orange outline/border cutout. It's too subtle — users miss which button to tap.

## Solution
Add tutorial-aware styling directly to the `BottomNav` component. When the walkthrough is active and targeting a nav button, that button gets a filled orange background with a pulsing glow, white icon/text, while others stay dimmed.

## Changes

### 1. `src/components/layout/BottomNav.tsx`
- Import `useTutorial` context
- Extract `isActive` and `currentStep` from the tutorial context
- For each nav item, check if `currentStep?.targetSelector === '[data-tutorial="<tutorialId>"]'`
- If matched and tutorial is active:
  - Fill the entire `<Link>` area with `bg-[#F47A19]` and `rounded-2xl`
  - Add pulsing glow: `shadow-[0_0_12px_rgba(244,122,25,0.5)] animate-pulse`
  - Force icon and label to `text-white`
- Non-targeted buttons stay unchanged

### 2. `src/hooks/useTutorial.tsx`
- Ensure the `TutorialContext` value already exposes `isActive` and `currentStep` — it does, so no changes needed here.

### What stays the same
- Bottom nav appearance outside the walkthrough — unchanged
- The overlay cutout in `TutorialOverlay.tsx` still renders (it will frame the glowing button)
- All other tutorial steps unaffected

### Technical detail
The match logic: `isActive && currentStep?.targetSelector === \`[data-tutorial="${tutorialId}"]\``  
Applied via conditional `cn()` classes on the existing Link and icon wrapper elements.

