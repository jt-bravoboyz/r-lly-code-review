

# Brand-Accurate SVG Icon + Reference Updates

## What gets built

### 1. New file: `public/logo.svg`
A clean SVG app icon — rounded-rect orange background (`#F47A19`) with a white waving flag silhouette centered inside. Simplified, high-contrast, suitable for favicon and app icon use at any size.

### 2. `index.html` updates (lines 21-22)
- Favicon: `<link rel="icon" type="image/svg+xml" href="/logo.svg" />`
- Apple touch icon: keep the PNG fallback (`rally-icon-192.png`) since iOS Safari does not support SVG for `apple-touch-icon`
- OG/Twitter image tags: keep PNG (social crawlers don't support SVG)

### 3. `public/manifest.json` updates
Add the SVG entry to the icons array:
```json
{
  "src": "/logo.svg",
  "sizes": "any",
  "type": "image/svg+xml",
  "purpose": "any maskable"
}
```
Existing PNG entries remain as fallbacks.

### 4. PNG generation
Not possible in this environment — raster conversion requires external tooling. The SVG becomes the source of truth; you can run it through any SVG-to-PNG converter to regenerate the 192/512/1024 PNGs with the correct `#F47A19`.

## Files

| File | Change |
|------|--------|
| `public/logo.svg` | New — brand icon SVG |
| `index.html` | Update favicon link to SVG |
| `public/manifest.json` | Add SVG icon entry |

3 files. Pure asset + metadata work.

