# R@lly Tab → Cinematic "Classified" Placeholder

The R@lly tab in the bottom nav routes to `/events` (`src/pages/Events.tsx`). That page is the only surface affected. Bottom nav, route, and label stay untouched. No other screens, hooks, or features are modified.

## Files

- **Replace** `src/pages/Events.tsx` — wipe current content, render new placeholder layout.
- **Create** `src/components/events/RallyFeedComingSoon.tsx` — encapsulated placeholder component (keeps page file thin and isolates animations).

Nothing else changes. Dress Code, Song Rec's, alerts dedup, EventDetail, CreateEventDialog, EventCard, hooks, etc. are not touched.

## Layout (RallyFeedComingSoon)

Full-height container (`min-h-[100dvh]`) with `BottomNav` rendered below. Dark base (uses existing `bg-background` and a layered radial overlay for cinematic depth).

```text
┌─────────────────────────────┐
│ header (minimal: just brand │
│  spacing, no actions)       │
├─────────────────────────────┤
│ ░ ghost card (blur, 20%)   │  ← background stack
│ ░ ghost card (blur, 18%)   │     (pointer-events-none)
│ ░ ghost card (blur, 15%)   │     subtle 30s vertical drift
│ ░ ghost card (cut off)     │
│                             │
│   ┌───────────────────┐    │  ← centered glass module
│   │ CLASSIFIED—TIER 02│    │     (absolute, dead center)
│   │                   │    │
│   │ R@LLY FEED        │    │
│   │ Public rallies.   │    │
│   │ Live near you.    │    │
│   │ ─────────────     │    │
│   │ • STAND BY        │    │
│   │   LAUNCHING SOON  │    │
│   └───────────────────┘    │
│                             │
│ [top + bottom gradient fade]│
├─────────────────────────────┤
│   BottomNav (unchanged)     │
└─────────────────────────────┘
```

### Background ghost stack
- 4 mock cards built with the same outer shape as `EventCard` (rounded-2xl, ~h-44, glass surface) but stripped to plain divs — no imports of EventCard, no event data, no handlers.
- Dummy text rendered inside each (Skybar Rooftop · Live Now · 247 going, etc.) so the silhouette reads as "real feed."
- Wrapped in a div with `filter: blur(14px)`, `opacity: 0.18-0.22`, `pointer-events-none`, `select-none`, `aria-hidden`.
- Subtle `animate-rally-drift` (new keyframe, ~30s, ±6px translateY).
- Top and bottom `bg-gradient-to-b` overlays fade the stack into the page background.

### Foreground glass card
- `absolute inset-0 flex items-center justify-center` overlay so it sits dead center over the stack.
- Card: `w-[82%] max-w-sm`, `rounded-3xl`, `backdrop-blur-2xl`, dark glass background (`bg-black/55 dark:bg-white/[0.04]`), 1px subtle border, layered shadow.
- Inner R@lly Orange glow via a pseudo-ring (`box-shadow: inset 0 0 24px hsl(22 90% 52% / 0.18)`) animated with `animate-rally-breath` (3.5s ease-in-out pulse on glow opacity 0.10 → 0.28).
- Padding `px-7 py-9`, content stacked with generous spacing.

### Foreground content
1. `CLASSIFIED — TIER 02` — `text-[10px] tracking-[0.32em] uppercase text-muted-foreground/70 font-montserrat`.
2. Headline `R@LLY FEED` — `text-4xl font-extrabold tracking-[0.08em] uppercase text-white font-montserrat`. The `@` is rendered as a span styled to match the existing brand wordmark (orange `text-primary` weight-black) — same treatment used in Index.tsx landing wordmark.
3. Subhead `Public rallies. Live near you.` — `text-sm text-white/65 font-montserrat`, generous `mt-3`.
4. Divider — thin `h-px bg-white/10 my-6 w-12 mx-auto` (cleaner than verbose spacing).
5. Status block:
   - Row: tiny blinking dot (`h-1.5 w-1.5 rounded-full bg-[#F47A19] animate-rally-blink`, 1.8s cycle) + `STAND BY` (`text-xs tracking-[0.3em] uppercase text-[#F47A19] font-bold`).
   - Below: `LAUNCHING SOON` (`text-[11px] tracking-[0.28em] uppercase text-white/55 mt-1.5`).

### Tap behavior
- Whole content wrapper gets `pointer-events-none` except… nothing. Glass card optional shimmer: skipped to keep cinematic restraint per spec ("pick whichever feels more premium" — chosen: no shimmer, just the breathing glow).

## Animations

Add three keyframes inline via Tailwind arbitrary classes in the component (no global CSS edits needed) using existing `tailwindcss-animate` patterns is not enough — we'll add three keyframes to `tailwind.config.ts` under existing `keyframes`/`animation` blocks (additive only, no removals):

- `rally-breath`: `box-shadow` opacity pulse, 3.5s ease-in-out infinite.
- `rally-blink`: opacity 1 → 0.25 → 1, 1.8s ease-in-out infinite.
- `rally-drift`: `translateY(0) → translateY(-6px) → 0`, 30s ease-in-out infinite.

These are net-new entries; nothing existing is modified.

## What is removed from `Events.tsx`

The entire current implementation (event listing, filters, headers, search, hooks like `useMyEvents`/`useEvents` calls if present in that file). The page becomes:

```tsx
import { BottomNav } from '@/components/layout/BottomNav';
import { RallyFeedComingSoon } from '@/components/events/RallyFeedComingSoon';

export default function Events() {
  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden pb-28">
      <RallyFeedComingSoon />
      <BottomNav />
    </div>
  );
}
```

No deletion of other files, hooks, or components — they remain available for `Index.tsx` and `EventDetail.tsx` which still use them.

## Out of scope (explicitly not touched)

- `BottomNav.tsx` (label, icon, route all unchanged)
- `Index.tsx`, `EventDetail.tsx`, `CreateEventDialog.tsx`, `EventCard.tsx`
- Dress Code, Song Rec's, alerts dedup migration, notifications hook
- Any DB / edge function / RLS

## Acceptance

Tapping R@lly in bottom nav → lands on `/events` showing blurred ghost card stack, centered glass module with the exact copy hierarchy, breathing orange glow, blinking status dot, drifting background. No taps do anything. Every other tab and feature behaves identically.
