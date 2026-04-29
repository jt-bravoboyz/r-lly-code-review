# Founder 25 Mini Medal — Visual Upgrade

Replace the flat purple polygon currently rendered next to Founding 25 members (`MiniFounderGem`) with a proper miniature **military-style ribbon medal**: a metallic purple coin suspended from a short ribbon, with a 5-point star, rim highlights, top specular, and a slow shimmer sweep — matching the same medal language we just shipped for Bronze/Silver/Gold activity badges.

## Where it appears

- `src/components/badges/MiniFounderGem.tsx` — the only file changed.
- Used inline next to display names across chat, profile sheets, attendee lists, etc. (callers don't change.)

## Visual design

```text
   ▙▖▜▖   ← purple ribbon (vertical stripes, dark center)
   ▙▖▜▖
   ▙▖▜▖
   ◯◯◯    ← metallic purple coin with rim
  ◯ ★ ◯   ← engraved star, top specular, shimmer sweep
   ◯◯◯
```

Specifically:

- **Ribbon** — short trapezoidal ribbon at top using a horizontal `linearGradient` (light purple → dark purple → light purple) to read as folded fabric. A darker sliver underneath to anchor the coin.
- **Coin** — circle with a `linearGradient` rim (light top-left → deep purple bottom-right) and a `radialGradient` face (highlight at 35%/30%, deep core at edges) for a struck-metal look.
- **Engraved ring** — thin dark stroke + offset light stroke inside the rim for a debossed feel.
- **5-point star** — white-to-lavender gradient with a soft Gaussian blur "glow", centered on the coin.
- **Top specular** — translucent white ellipse near the top-left of the coin (fixed light source).
- **Shimmer sweep** — angled white rectangle, `clipPath`'d to the coin, animating left → right every ~4.2s with fade in/out.
- **Drop shadow + purple ambient glow** via CSS `filter: drop-shadow()` on the SVG.

Tone stays in the existing R@lly purple family (`#9B4DCA` / `#5A1F8C` / `#E0B8FF`) to remain consistent with the larger `FounderBadgeCard`.

## Sizing & layout

- Bumps the SVG from `16x16` to `18x22` to fit the ribbon above the coin while keeping the inline footprint tight.
- `align-middle` + `inline-flex` so it sits cleanly next to text without shifting line height.
- Default `className` preserved when none is passed; existing callers continue to work unchanged.

## Animation

- Single `@keyframes miniFounderShimmer` sweep on a clipped rect — lightweight, runs in CSS only.
- Removes the previous `animate-mini-founder-glow` class dependency in favor of an SVG-local shimmer + filter glow, so the effect is self-contained and predictable.

## Out of scope

- No changes to `FounderBadgeCard`, `useFounderIds`, or any caller.
- No new assets, no new tokens, no DB changes.

## Files modified

- `src/components/badges/MiniFounderGem.tsx` (full rewrite, ~120 lines)
