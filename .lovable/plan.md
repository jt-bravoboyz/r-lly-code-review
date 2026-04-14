

# Plan: Change Default Theme to Light Mode

## Problem
The app defaults to `'system'` theme, which causes dark mode at night — making the onboarding tutorial hard to follow.

## Changes

### 1. `src/contexts/ThemeContext.tsx`
- Line 26: Change fallback from `'system'` to `'light'` (when no stored preference exists)
- Line 28: Same change for SSR fallback

### 2. `src/hooks/useAppSettings.tsx`
- Line 72: Change `theme` default from `'system'` to `'light'` in `DEFAULT_SETTINGS`

### 3. `src/pages/Settings.tsx`
- Line 156: Change the reset handler to set theme to `'light'` instead of `'system'`

The existing theme toggle in Settings (Light / Dark / System) remains unchanged. Users can still manually switch. The only difference is new users start in light mode instead of system mode.

