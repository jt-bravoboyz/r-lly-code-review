

# Plan: Redesign Founder 25 Badge Visual — Purple Gem

## Overview

Replace the current orange crown icon with a premium animated purple hexagonal gem. All logic, category placement, and labels stay identical — only the visual design of `FounderBadgeCard.tsx` changes.

## What Changes

**Single file modified:** `src/components/badges/FounderBadgeCard.tsx`

### Visual Redesign

1. **Hexagonal gem shape** — Replace the Crown icon with an inline SVG of a tall vertical hexagon (gemstone silhouette) containing:
   - Internal facet lines (subtle, low-opacity white strokes for depth)
   - "FOUNDER" in small uppercase + "25" in larger text, centered in white with slight transparency

2. **Deep purple color palette** — Replace all `#F47A19` orange references with a shifting purple gradient using `#7B2FBE`, `#9B4DCA`, `#C77DFF`, `#5A189A`, `#E0AAFF`

3. **CSS Animations** (all in the existing `<style>` block):
   - **Breathing glow**: Purple box-shadow pulse on 3s cycle
   - **Gradient shift**: `@keyframes` that animates `background-position` across the gem surface for liquid amethyst effect
   - **Light shimmer**: White diagonal sweep across the card (existing pattern, recolored to white)
   - **Floating motion**: Subtle `translateY` oscillation (2px up/down on 4s cycle)
   - **Sparkle particles**: 3-4 tiny cross/star shapes positioned around gem edges using `::before`/`::after` pseudo-elements with staggered fade-in/out animations
   - **Sonar rings**: 1-2 expanding purple ring pulses that emanate outward and fade

4. **Card container**: Border changes from orange to purple tint (`border-[#9B4DCA]/30`), background stays glassmorphism (`bg-card/60 backdrop-blur-xl`)

5. **Text**: Founder number color changes from orange to `#C77DFF`

### What Does NOT Change
- Component props, interface, conditional rendering logic
- "Permanently Earned · Exclusive" label
- Position in the Exclusive section on Achievements page
- Any other badge or component

