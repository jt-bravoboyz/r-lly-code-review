# Improve RallyHome Mini-Tab Active-State Readability

## Goal
Make the active mini-tab in `src/components/home/rallyhome/RallyHomeTabs.tsx` clearly readable against the translucent glass tab bar by replacing the low-contrast orange-on-orange-tint active state with a high-contrast solid cream pill.

## Selected Direction
**Solid Cream Pill** — active tab fills with R@lly cream (`#FFF3E9`) and uses R@lly Orange (`#F47A19`) for text and icon, giving it a floating, readable "selected" look while keeping the translucent glass background.

## Changes
1. **Component styling** in `src/components/home/rallyhome/RallyHomeTabs.tsx` (around line 64–68)
   - Replace the active-tab class `bg-primary/15 text-primary shadow-[inset_0_-2px_0_0_hsl(var(--primary))]` with a solid cream pill.
   - Keep the inactive tabs as `text-white/60 hover:text-white` so they remain readable against the dark glass background.
   - Preserve the rounded pill shape (`rounded-xl`) and the translucent tab bar container (`bg-white/5 backdrop-blur-xl`).

2. **Add semantic tokens** (if not already present)
   - Add a new `rally-cream` token to `src/index.css` to keep the brand color out of the component, e.g.:
     ```css
     --rally-cream: 30 100% 96%;
     ```
   - Use the new token as `bg-rally-cream` and the existing `text-primary` for the orange foreground.

3. **Verify dark/light consistency**
   - Confirm the cream pill remains readable on the dark glass background.
   - If needed, adjust the token for dark mode so the cream stays a warm off-white rather than flipping to a dark secondary.

## Verification
- Open the event detail page for any live R@lly and confirm the `Plan / Location / Rides / Status` tab bar is visible.
- Tap each tab and confirm the active pill is clearly readable and visually distinct from inactive tabs.
- Check in both light and dark modes.

## Scope
Visual-only change to the RallyHome mini-tab bar. No functional changes to tab content, state, or routing.
