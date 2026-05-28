# Theme event-detail buttons per flyer theme

Recolor the 6 currently-orange UI elements on the event detail page so each flyer theme uses its own accent color instead of always R@lly Orange. Visual only — no behavior, copy, or layout changes.

## Color map

| Theme | Accent |
|---|---|
| R@lly Signature | `#F47A19` (keep orange) |
| Tequila Sunset | `#F47A19` (keep orange) |
| Midnight Disco | Purple `#7C5CFF` |
| Garden Party | Light pink `#F4A6B8` |
| Neon Warehouse | Green `#3DDC84` |
| Sunday Brunch | Mauve `#B07A9E` |
| Golden Hour | `#F47A19` (keep orange) |
| Game Day | `#F47A19` (keep orange) |
| Beach Club | Light blue `#5EC4E6` |

## Elements being recolored

1. Date tile (JUN 20 orange square)
2. Invite Friends pill (icon + accent)
3. Join R@lly bottom CTA
4. Suggest song / Suggest shirt icon chips
5. Directions button
6. Request Ride button

## Implementation

1. **`src/lib/flyerThemes.ts`** — add `getFlyerAccent(themeKey)` returning `{ accent, accentFg }` using the table above. `accentFg` is white for all colored themes; for the orange themes it stays white as today.
2. **`src/pages/EventDetail.tsx`** (and any extracted children for the 6 elements: date tile, Invite Friends pill, Join R@lly CTA, Suggest chips, Directions, Request Ride) — replace hardcoded `bg-primary` / `#F47A19` / `bg-[#F47A19]` on those 6 elements with `style={{ background: accent, color: accentFg }}` driven by the event's `flyer_theme`. Where the orange currently appears as a small icon stroke (e.g. Invite Friends person+ icon, Suggest song/shirt icons), swap `text-primary` for `style={{ color: accent }}`.
3. Leave all other orange UI across the app untouched (bottom nav, badges, tutorial, etc.).

## QA

Switch the event through each of the 9 themes and confirm:
- Orange themes (Signature, Tequila Sunset, Golden Hour, Game Day) look unchanged.
- Midnight Disco shows purple, Garden Party light pink, Neon Warehouse green, Sunday Brunch mauve, Beach Club light blue across all 6 elements.
- Text on each CTA stays readable.
