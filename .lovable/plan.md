

# Fix: Center Sonar Rings on Founder 25 Gem

## Problem
The sonar rings are positioned inside a full-width container (`absolute inset-0`) and use a hardcoded `left: 40px`, so they don't align with the gem icon which sits on the left side of a flex row.

## Solution
Move the sonar rings from the card-level container into the gem's own container (the `relative flex-shrink-0 founder-float` div around the SVG). This way they automatically center on the gem. Remove the `left: 40px` hack from the CSS.

### Changes in `src/components/badges/FounderBadgeCard.tsx`:

1. **Remove** the sonar ring wrapper div (lines 14-18) from its current card-level position
2. **Add** the two sonar ring divs inside the gem container div (after the sparkles, before the outer glow, around line 28)
3. **Update CSS**: Remove `left: 40px` from `.founder-sonar-ring` and add centering via `top: 50%; left: 50%; transform-origin: center; margin-top: -40px; margin-left: -40px` (half of the 80px dimensions)

Single file change, no logic affected.

