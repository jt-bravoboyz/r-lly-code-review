# Trim Flyer Themes to 5 + Add "No Theme"

## Goal
The theme picker should offer exactly six options: **No Theme**, R@lly Signature, Tequila Sunset, Garden Party, Sunday Brunch, Beach Club. Midnight Disco, Neon Warehouse, Golden Hour and Game Day are removed. If a host picks nothing, the event automatically uses **No Theme** — the plain R@lly look with no themed background.

## What changes for the user
- Create R@lly → Flyer Vibe carousel shows "No Theme" first (selected by default), then the five keepers, plus the existing "Your photo" upload tile.
- "No Theme" events render the standard R@lly event page: no themed backdrop image, no color blobs, standard orange buttons and normal app text colors.
- Shared flyer / link previews for a No Theme event use the clean R@lly Signature layout (dark R@lly backdrop with orange title) so shared links still look branded.
- Existing events are unaffected — a data check confirms every current event uses R@lly Signature, Tequila Sunset, Garden Party or Beach Club, so nothing needs migrating.

## Technical notes
- `src/lib/flyerThemes.ts`
  - Reduce `FlyerThemeKey` / `FLYER_THEMES` / `FLYER_BUTTON_ACCENT` to the five kept themes; drop the four unused background imports.
  - Add a `'none'` sentinel key (label "No Theme") exported separately from `FLYER_THEMES` so it can appear in the picker without carrying a background.
  - Add `isThemedFlyerKey(key)` helper: false for `null`, `'none'`, and any legacy/removed key. `getFlyerTheme()` keeps falling back to `rally_dynamic` for rendering purposes.
- `src/components/events/FlyerThemePicker.tsx`: render a "No Theme" tile (neutral R@lly-orange-on-dark swatch, no bg image) ahead of the theme tiles; selecting it clears any custom image; the footer "Showing:" label reads "No Theme".
- `src/components/events/CreateEventDialog.tsx`: initialize `flyerTheme` to `'none'` and persist `'none'` (the `events.flyer_theme` column is `NOT NULL default 'rally_dynamic'`, so a sentinel string avoids a schema change). The themed flyer preview is hidden while `'none'` is selected unless a custom photo is uploaded.
- `src/pages/EventDetail.tsx`: gate `EventThemeProvider`'s `disabled` prop and the `getFlyerButtonAccent` map marker color on `isThemedFlyerKey(...)` instead of the current truthiness check, so `'none'` behaves like no theme.
- `supabase/functions/render-event-og-image/index.ts`: delete the four removed theme entries from its local map and map `'none'` (and unknown keys) to the `rally_dynamic` entry.
- No database migration and no backfill required.
