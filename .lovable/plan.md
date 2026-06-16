## Plan

**Goal:** Step 3 — make the real "Create Event" card fully readable (icon + label visible, not washed out by the spotlight), keep the coach modal from covering it, and update the body copy.

### Changes

1. **Update Step 3 body copy** (`src/hooks/useTutorial.tsx`)
   - Replace the `create-rally` step's `instruction` with:
     > "Tap it. Name it. Drop a Location and Time. Dress code, song recs, the vibe — all yours. Then send out the invites."

2. **Stop washing out the card** (`src/components/tutorial/TutorialOverlay.tsx`)
   - For the `create-rally` step, skip the inner radial-gradient + `animate-ping` layers that currently sit inside the spotlight box. Those layers (mixBlendMode: screen) are what's flooding the card in orange and hiding the Plus icon and "Create Event" label.
   - Keep just the outer ambient glow, the dark cutout, and the orange ring around the card so the real card content reads clearly.
   - Keep the existing lifted hero glow on the card itself.

3. **Make the coach modal compact for Step 3** (`src/components/tutorial/TutorialOverlay.tsx`)
   - Step 3 modal is too tall and overlaps the highlighted card on 390x645 screens.
   - Tighten only the Step 3 card: reduced padding, smaller title, smaller body, smaller Continue button — so it fits comfortably between the highlighted card and the bottom nav without covering the card.
   - Pin Step 3 modal to `bottom-24` so it sits just above the nav, leaving room above for the spotlight.

### Out of scope
- No changes to other steps, no changes to the Home page, no backend changes.