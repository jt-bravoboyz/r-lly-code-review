The `public/rally-icon-source.png` file has the checkerboard pattern baked into its pixels — it's not actual transparency. That's why the loader now shows a checkered square instead of a clean flag.

Fix: stop relying on a PNG and render the R@lly flag as inline SVG in both the boot splash and the React loader. Inline SVG paints on the very first frame (zero network, zero decode) and is guaranteed transparent.

Plan:
1. `index.html` boot splash
   - Replace the `<img class="rally-boot-flag">` with an inline `<svg>` of a clean white waving-flag glyph (matches the Lucide Flag icon style already used across the app).
   - Keep the 96px size, drop shadow, and breathe animation on the SVG.
   - Remove the now-unused `<link rel="preload" as="image" href="/rally-icon-source.png">`.

2. `src/components/AuthLoadingState.tsx`
   - Replace the `<img>` with the exact same inline SVG markup, same size, same filter, same `auth-flag-scale` animation.
   - Keep the dark background, beacon rings, and radial breathe untouched so the handoff stays seamless.

3. Leave all other icons alone
   - Favicon, apple-touch-icon, manifest, and PWA icons keep using the existing orange app icons.