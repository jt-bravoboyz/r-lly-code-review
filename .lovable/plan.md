## What's happening
Yes — when you create a R@lly, it auto-assigns the `rally_dynamic` flyer theme. The `CreateEventDialog` initializes `flyerTheme` to `DEFAULT_FLYER_THEME` and saves it on submit, so every new event opens the details screen with a theme already painted on.

## Fix
Make "no theme" the default. A theme only applies once the host taps a tile in the Flyer Vibe picker.

### Changes
1. **`src/components/events/CreateEventDialog.tsx`**
   - Change `flyerTheme` state type to `FlyerThemeKey | null`, initial value `null`.
   - On submit, pass `flyer_theme: isBarHopType ? null : flyerTheme` (already conditional — just allow null through).
   - Update `FlyerThemePicker` `value` prop to accept null (show no tile selected until user picks one).

2. **`src/components/events/FlyerThemePicker.tsx`**
   - Accept `value: FlyerThemeKey | null`.
   - When `value` is null and no custom image, render no selected ring and show "Showing: None" (or hide the line).

3. **`src/hooks/useEvents.tsx`** (line 206)
   - Pass `(event as any).flyer_theme ?? null` instead of falling back to `'rally_dynamic'`, so the DB stores null when the host didn't pick.

4. **No change needed to `EventThemeProvider`** — it already gracefully handles a missing/unknown key via `getFlyerTheme`, but with null stored it will fall back to the default visual. To make the event detail screen truly themeless when null, wrap the provider usage in `EventDetail.tsx` with `disabled={!event.flyer_theme && !event.flyer_image_url}` (the prop already exists).

### Result
- Brand-new R@lly → details screen renders with the plain app background, no flyer vibe.
- Host opens the Flyer Vibe picker and taps a tile → that theme is saved and the detail screen adopts it.
- Custom photo upload path is unchanged.