## Goal
Make the entire Event Detail page dynamically adopt the glassmorphism aesthetic of the host's selected `flyer_theme` (one of 9 themes). Background, glass tints, accent glows, title gradient, and card surfaces all shift per theme — while keeping the page legible, mobile-safe, and consistent with the existing 2026 Glass/Liquid system.

## Approach

### 1. New theming primitive: `EventThemeProvider`
Create `src/components/events/EventThemeProvider.tsx`:
- Accepts `themeKey` from `event.flyer_theme`.
- Resolves the full `FlyerTheme` via `getFlyerTheme()`.
- Renders a fixed-position **ambient backdrop layer** (z=0, behind content):
  - Full-bleed `bgPublicPath` image, `object-cover`, slight scale + slow drift animation.
  - Two ambient color blobs using `palette[0]` and `palette[1]` (`blur-3xl`, low opacity, animated drift) for the signature R@lly "liquid" feel.
  - A dark/light scrim derived from `archTint` to guarantee text contrast.
- Pushes CSS custom properties onto a wrapper div so descendants can opt-in:
  ```
  --theme-accent, --theme-accent-2, --theme-ink, --theme-meta,
  --theme-glass-tint, --theme-glass-border, --theme-glow,
  --theme-title-gradient
  ```
- Computes a `mode: 'light' | 'dark'` flag from `archTint` luminance so glass surfaces know whether to use white-over-dark or black-over-light tinting (Garden Party / Sunday Brunch / Beach Club are light; the rest dark).

### 2. New `ThemedGlassCard` wrapper
Create `src/components/events/ThemedGlassCard.tsx` — a thin wrapper over shadcn `Card` that:
- Uses `backdrop-blur-xl` + `bg-[var(--theme-glass-tint)]` + `border-[var(--theme-glass-border)]`.
- Adds the theme's `frameGlow` as a soft shadow.
- Inner highlight stroke for the liquid-glass look already used elsewhere in the app.
- Same API as `Card` (drop-in) so refactor is a search-and-replace inside `EventDetail.tsx`.

### 3. Refactor `src/pages/EventDetail.tsx`
- Wrap the page's outer `<div>` in `<EventThemeProvider themeKey={event.flyer_theme}>`.
- Replace plain `Card` usages in the main content stream with `ThemedGlassCard` (keep shadcn `Card` for modals/dialogs that already live in portals on neutral surfaces).
- Title / hero heading: apply `bg-clip-text` with `--theme-title-gradient` so the event title shifts per theme.
- Section headings & primary icons: tint with `--theme-accent`.
- Primary CTAs ("Join R@lly", "I'm Here", "Start R@lly", etc.): keep R@lly Orange brand button when theme is `rally_dynamic`; for other themes, add a `theme` variant that fills with `--theme-accent` and chooses contrasting foreground from `mode`.
- Tab bar (Tabs/TabsList): glass surface with active indicator using `--theme-accent`.
- Badges (vibe chips, status pills): swap the static `VIBE_STYLES` map for theme-aware glass pills.
- Carousel frame / map preview / AfterRallyCard: thin border + glow from theme.
- Loading skeleton: tint via theme accent.

### 4. Safety/legibility rules (Core memory compliance)
- 44px touch targets preserved.
- All text colors come from `--theme-ink` / `--theme-meta` so light themes (brunch/garden/beach) flip to dark text automatically.
- Never drop below WCAG AA contrast — scrim opacity is tuned per theme in the registry (already handled by `archTint`).
- Mapbox map styling stays untouched (per Maps memory).
- R@lly Orange stays primary on `rally_dynamic`; other themes get their accent but the brand button (e.g. publish, share, brand logo) stays Orange.

### 5. Subtle motion (no new deps)
- Background image: 18s `ken-burns` scale 1.0→1.04 ease-in-out infinite alternate.
- Ambient blobs: 22s drift via existing Tailwind keyframes (or add `theme-drift` to `tailwind.config.ts`).
- Glass cards: existing fade-in/scale-in on mount.

### 6. Edge cases
- `event.flyer_theme` missing → `getFlyerTheme()` already defaults to `rally_dynamic`.
- If host changes theme later, the page re-renders via the existing `useEvent` query; backdrop crossfades (200ms opacity).
- Recap / "Rally Complete" overlay and modals keep their own designs — they sit above the themed surface and are intentionally unaffected.

## Files touched
```text
NEW   src/components/events/EventThemeProvider.tsx
NEW   src/components/events/ThemedGlassCard.tsx
EDIT  src/pages/EventDetail.tsx            (wrap + swap Card→ThemedGlassCard + title gradient + accent tokens)
EDIT  tailwind.config.ts                   (add `theme-drift` / `ken-burns` keyframes if not present)
```

No DB changes. No edge function changes. No new dependencies.

## Out of scope (ask if you want these next)
- Theming child components (`AfterRallyCard`, `RallyHeroMediaCarousel`, `SafetyTracker`, `EventChat`, etc.) deeply. They will inherit the ambient backdrop + CSS vars, but their internal surfaces stay on shadcn tokens for this pass. Happy to do a follow-up sweep.
- Theming the global `Header` / `BottomNav` while on the event page.
- Per-theme custom fonts beyond Montserrat (titles get the gradient, not the font swap — flyer fonts are Playfair, which would conflict with our Core typography rule unless you want me to allow it on this page).