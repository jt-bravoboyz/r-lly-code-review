# Theme Color Audit: 9 Flyer Themes on Event Detail

Goal: verify text and background/surface colors read correctly in every flyer theme on the event detail screen and its sheets, then fix what fails.

## How the review works

1. Pick one real event and temporarily switch its flyer theme through all 9 keys (rally_dynamic, tequila_sunset, midnight_disco, garden_party, neon_warehouse, sunday_brunch, golden_hour, game_day, beach_club) while capturing screenshots.
2. For each theme, capture the event detail page plus its key sheets/panels:
   - Hero + title + date tile + host row
   - Tabs (Details / Rides / Photos / Chat) in active and inactive state
   - Primary action bar and CTAs
   - Location map preview + Directions pill
   - Rides panel, photo gallery, chat, After R@lly / safety cards
   - Any modals opened from the page (invite, suggest, claim, ride setup)
3. Review each capture for: unreadable body text, headings that vanish into the backdrop, muted text below contrast, chips/badges with white-on-light or dark-on-dark text, icons that disappear, and inputs/placeholders that lose contrast.
4. Produce one findings list grouped by theme, then fix.

## What gets fixed and where

Fixes stay in styling only:

- `src/index.css` themed block (`.event-themed*`): correct the token-driven rules for ink, meta, glass tint/border, tab states, accent headings, title gradient contrast.
- `src/components/events/EventThemeProvider.tsx`: correct the light/dark mode derivation and ink/meta/glass token math when a theme lands on the wrong side of the light/dark split (garden_party, sunday_brunch, beach_club are the light-scrim themes).
- `src/lib/flyerThemes.ts`: adjust a theme's `archTint`, `titleGradient`, `palette` accent, or button accent only where the palette itself is the cause of the failure.
- Component-level hardcoded colors (e.g. `text-white`, fixed white/black chips) inside event detail and its sheets get swapped to themed tokens or `ev-ink`/`ev-ink-strong`/`ev-glass` utilities so they follow the theme.

The event's theme is restored to its original value after the sweep; no event data is left changed.

## Deliverable

- A per-theme findings + fixes summary in chat.
- Contrast-safe text on every themed surface for all 9 themes, with light-scrim themes (garden party, brunch, beach club) using dark ink and dark-scrim themes using light ink consistently.

## Technical notes

- Themed styling is centralized: `EventThemeProvider` sets `--theme-ink`, `--theme-meta`, `--theme-ink-strong`, `--theme-glass-tint`, `--theme-glass-border`, `--theme-accent*`, `--theme-button*` and a `event-themed--light|dark` class; `src/index.css` maps those to card/tab/heading/CTA surfaces. Most fixes should land on those tokens/rules rather than per-component overrides.
- Light/dark mode is currently derived from the luminance of `archTint` (>0.6 = light). Themes whose backdrop image is dark but scrim is light (or vice versa) can be misclassified — that check gets validated per theme during the sweep.
- Contrast target: WCAG AA (4.5:1 body, 3:1 large text/icons) measured against the effective composited surface, not the raw scrim.
