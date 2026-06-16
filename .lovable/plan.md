## Problem
On Step 3 of the tutorial walkthrough, the Create Event button has the hero halo applied but its colors appear washed-out compared to the real Home screen. The white card,1201, peach icon tile, orange + icon, and near-black label text all look muted as if a dark overlay is bleeding through.

## Solution
Add new CSS rules below the existing `.rally-scan-hero` block in the global stylesheet. These rules force the hero element and its children to render with explicit, opaque brand colors and remove any inherited blur/brightness/saturation filters.

### File to modify
- `src/index.css` — append new rules after the existing `.rally-scan-hero::after` block (after line ~2378)

### Rules to add (exact CSS)
```css
/* Force the hero element itself to render with a pure white card background */
.rally-scan-hero {
  background-color: #FFFFFF !important;
  border-color: #FFFFFF !important;
}

/* Force any image, icon container, or background inside the hero element to render at full color */
.rally-scan-hero > *,
.rally-scan-hero > * > *,
.rally-scan-hero > * > * > * {
  filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Force the inner icon tile (the peach/cream rounded square holding the + icon) to render at brand color */
.rally-scan-hero [class*="bg-orange"],
.rally-scan-hero [class*="bg-[#F"],
.rally-scan-hero [class*="bg-amber"],
.rally-scan-hero [class*="bg-peach"] {
  background-color: #FFEDD5 !important;
}

/* Force the + icon (orange) to render at full brand orange */
.rally-scan-hero svg,
.rally-scan-hero [class*="text-orange"],
.rally-scan-hero [class*="text-[#F4"] {
  color: #F47A19 !important;
  fill: #F47A19 !important;
  stroke: #F47A19 !important;
}

/* Force the "Create Event" text label to render at full near-black */
.rally-scan-hero [class*="text-foreground"],
.rally-scan-hero [class*="text-black"],
.rally-scan-hero [class*="text-slate"],
.rally-scan-hero [class*="text-gray-9"],
.rally-scan-hero [class*="text-zinc-9"],
.rally-scan-hero h1,
.rally-scan-hero h2,
.rally-scan-hero h3,
.rally-scan-hero p,
.rally-scan-hero span,
.rally-scan-hero div {
  color: #1F2937;
}

/* Override the global text color rule with !important specifically for the visible label text — leave SVG and orange-tinted text alone */
.rally-scan-hero > div > span:not([class*="text-orange"]):not([class*="text-[#F4"]),
.rally-scan-hero > div > p:not([class*="text-orange"]):not([class*="text-[#F4"]) {
  color: #1F2937 !important;
}
```

### Constraints
- Do NOT modify any existing `.rally-scan-hero`, `::before`, `::after`, `@keyframes`, `.rally-scan-highlight`, `.rally-scan-settled`, or `.rally-backdrop-deep` rules.
- Do NOT touch `TutorialOverlay.tsx`, `useTutorial.tsx`, the Create Event button component, Profile.tsx, Settings.tsx, bottom nav, or any walkthrough logic.
- Do NOT install new packages or add console logs.

### Acceptance criteria
- Step 3: Create Event card background is pure opaque white (`#FFFFFF`).
- Inner icon tile is peach/cream (`#FFEDD5`).
- `+` icon is fully orange (`#F47A19`).
- "Create Event" label text is near-black (`#1F2937`) and fully readable.
- Orange breathing halo continues its 1800ms cycle unchanged.
- Quick R@lly card next to it stays dimmed.
- Continue to Step 4 cleans up cleanly with no leftover overrides.
- Step 2 nav scan still works correctly.
- No TypeScript or console errors.