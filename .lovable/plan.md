# R@lly Tab Placeholder Upgrade

Surgical update to a single component — `src/components/events/RallyFeedComingSoon.tsx`. No other files touched. Bottom nav, routing, and all other shipped features remain untouched.

## What Changes

1. **Replace the static blurred ghost stack** with a continuously scrolling, infinitely looping mock rally feed rendered behind the glass card.
2. **Fix the centered card** so it is true glassmorphism (translucent + heavy backdrop-blur), theme-aware for both light and dark mode.
3. **Foreground content stays identical**: "CLASSIFIED — TIER 02", "R@LLY FEED" headline, "Public rallies. Live near you.", divider, blinking "● STAND BY", "LAUNCHING SOON". Breathing orange glow preserved.

## Scrolling Mock Feed

- Build an array of ~10 mock rally cards in the component:
  - Skybar Rooftop · Live Now · 247 going
  - Warehouse Party · Tonight 11PM · 89 going
  - Sundown Sessions · Saturday · 156 going
  - The Local · Tonight · 42 going
  - Neon Nights · Friday 10PM · 312 going
  - Rooftop Reset · Sunday Brunch · 78 going
  - Basement Sessions · Tonight 9PM · 64 going
  - Golden Hour Garden · Saturday 6PM · 198 going
  - Lantern Loft · Friday 11PM · 121 going
  - Pier 7 Afters · Sunday 2AM · 53 going
- Each mock card: rounded image at top + 2 lines of fake meta text below (matches real EventCard rhythm visually).
- Photos: small Unsplash URLs (`?w=400&q=60`) covering nightlife / rooftop / warehouse / sunset / neon / lounge themes for visual variety. Use `loading="lazy"` and `decoding="async"`.
- Render the stack twice back-to-back inside a single scrolling container so the loop is seamless.
- Animate via CSS keyframe `rally-feed-scroll` translating the inner column from `translateY(0)` to `translateY(-50%)`, `linear`, infinite, ~60s duration (slow, meditative drift).
- Layer styles on the wrapping feed container:
  - `filter: blur(20px) saturate(1.15)` (light mode bumps saturation a touch via theme variant)
  - `opacity: 0.32` (light) / `0.38` (dark)
  - `will-change: transform` on the scrolling inner div
  - `pointer-events-none`, `select-none`, `aria-hidden`
- Add top + bottom gradient fade overlays (already in place) tuned to use `bg-background` so they adapt to theme automatically.

## True Glass Card Fix

Centered module changes:
- Background: replace `bg-black/55` with theme-adaptive `bg-white/55 dark:bg-black/45`.
- Backdrop blur: `backdrop-blur-2xl` + inline `WebkitBackdropFilter: 'blur(28px) saturate(1.4)'` and matching `backdropFilter`.
- Border: `border border-white/40 dark:border-white/10`.
- Shadow: `shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]`.
- Keep existing `rally-breath` keyframe for the orange inner glow ring.
- Foreground text gets a theme-adaptive token swap so it remains legible in light mode:
  - "CLASSIFIED" tag: `text-foreground/55`
  - Headline: `text-foreground`
  - Subhead: `text-foreground/65`
  - Divider: `bg-foreground/15`
  - "STAND BY" + dot stay R@lly Orange (`#F47A19`)
  - "LAUNCHING SOON" muted: `text-foreground/55`
- Orange `@` in the headline keeps `text-primary`.

## Performance

- Pure CSS transform loop — no JS scroll handlers, no `setInterval`.
- Single scrolling container, transform-only animation, `will-change: transform`.
- Lazy-loaded small Unsplash images (~400px wide) for the mock photos.

## Acceptance Mapping

- Continuously scrolling blurred feed behind glass: scrolling container with duplicated stack + 60s linear loop.
- Unreadable feed text: 20px blur + 0.32–0.38 opacity.
- Real glass card visible motion/color through it: translucent bg + 28px backdrop blur with saturate.
- Foreground content identical: copy, hierarchy, and animations unchanged.
- Light + dark mode premium: theme-adaptive bg, border, shadow, and foreground tokens.
- Seamless loop: stack rendered twice, animation goes 0 → -50%.
- No other tab/feature touched: only `RallyFeedComingSoon.tsx` is modified.

## Files

- Edit: `src/components/events/RallyFeedComingSoon.tsx` (only file changed)

## Out of Scope

`src/pages/Events.tsx`, `BottomNav`, `tailwind.config.ts`, any other page, hook, edge function, migration, Dress Code, Song Rec's, alerts dedup, Founder 25.
