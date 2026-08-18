Swap tab bar color treatments between the main event tab bar and the RallyHome mini-tab bar.

## Current state
- Main event tabs (`Details · R@lly Home · Photos · Chat`) in `src/pages/EventDetail.tsx` use the default shadcn treatment: `bg-muted` bar, active `bg-background text-foreground`.
- RallyHome mini-tabs (`Plan · Location · Rides · Status`) in `src/components/home/rallyhome/RallyHomeTabs.tsx` use the high-contrast pop treatment: translucent glass bar (`bg-white/5 border-white/10 backdrop-blur-xl`), active cream pill (`bg-rally-cream text-primary` with orange shadow).

## Goal
Make the main event tabs pop and the RallyHome mini-tabs recede, by swapping the two color schemes.

## Plan
1. **Promote the main event tab bar** to the pop treatment.
   - In `src/pages/EventDetail.tsx`, replace the `TabsList`/`TabsTrigger` classes with a translucent glass bar and a cream active pill matching the current RallyHome mini-tab style.
   - Keep the grid layout (4 columns), responsive text sizes, and icons.
   - Ensure the active tab reads clearly against both light and dark event themes.

2. **Tone down the RallyHome mini-tab bar** to a muted treatment.
   - In `src/components/home/rallyhome/RallyHomeTabs.tsx`, keep the rounded glass bar but change the active state to a low-key gray/white pill (`bg-white/10 text-white` or `bg-zinc-800/80 text-white`) with a subtle border instead of the cream/orange shadow.
   - Keep inactive tabs as `text-white/60 hover:text-white` so they stay subtle inside the dark event page.

3. **Verify visually** with preview screenshots of the event detail page, checking both tab bars and both active/inactive states for readability.

## No new dependencies
Both components are already using Tailwind tokens; the only work is class-name swaps. No runtime or database changes are needed.
