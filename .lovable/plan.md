

# Replace App Icon with Provided Image

## What gets done

Copy the uploaded PNG to replace the existing icon assets, ensuring the app icon matches the provided image exactly across all contexts.

## Changes

### 1. Copy uploaded image to public assets
- Copy `user-uploads://ChatGPT_Image_Mar_27_2026_04_03_07_PM.png` to `public/rally-icon-1024.png` (replaces existing)
- Copy same file to `public/rally-icon-192.png` (replaces existing)

### 2. Update `public/logo.svg` reference
Since the new source of truth is a PNG, update `index.html` favicon to point to the PNG instead of SVG, or keep SVG as a secondary reference. The `apple-touch-icon` already points to `rally-icon-192.png` which will be updated.

### 3. No manifest changes needed
`manifest.json` already references `rally-icon-192.png` and `rally-icon-1024.png` — replacing the files in-place means all references stay valid.

## Files

| File | Change |
|------|--------|
| `public/rally-icon-1024.png` | Replace with uploaded image |
| `public/rally-icon-192.png` | Replace with uploaded image |

2 file replacements. Direct asset swap, no code changes.

