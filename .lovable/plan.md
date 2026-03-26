

# Sync App Icon & Splash Screen to Brand Orange (#F47A19)

## Current State
Three different orange values are used across installation metadata:
- `manifest.json`: `#FF6B35` (old brand orange)
- `index.html` theme-color: `#F97316` (Tailwind orange-500)
- In-app CSS token: `hsl(27 91% 53%)` which equals `#F47A19`

All three need to unify to `#F47A19`.

## Changes

### 1. `public/manifest.json` (lines 8-9)
- `background_color`: `#FF6B35` → `#F47A19`
- `theme_color`: `#FF6B35` → `#F47A19`

### 2. `index.html` (line 24)
- `theme-color` meta: `#F97316` → `#F47A19`

This single meta tag controls Android Chrome's address bar color, so it also resolves the Android nav bar requirement.

### 3. Logo Assets
The icon PNGs (`rally-icon-192.png`, `rally-icon-1024.png`) were generated with the old orange. These are raster files that cannot be color-corrected in code — they would need to be regenerated. I'll flag this for you but cannot recolor PNGs automatically. If the difference is noticeable, you'd re-export the icon with the correct `#F47A19` background and re-upload.

## What Does NOT Change
- `apple-mobile-web-app-status-bar-style` stays `black-translucent` (this is correct for notched iPhones — it makes the status bar transparent over your app content)
- Layout, components, functionality

## Files

| File | Change |
|------|--------|
| `public/manifest.json` | Update `background_color` and `theme_color` to `#F47A19` |
| `index.html` | Update `theme-color` meta to `#F47A19` |

2 files, 3 line edits. Pure metadata alignment.

