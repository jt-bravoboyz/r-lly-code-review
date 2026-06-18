## Problem

On the boot splash, you sometimes see a plain orange/dark square instead of the R@lly flag. The CSS for the splash is inlined in `index.html` and paints immediately, but the logo `<img src="/rally-icon-192-v6.png">` is a separate HTTP request. On slow networks, cold loads, or PWA cold starts, the splash shows for a moment before the image arrives — so you see the circular stage (which reads as a square/blob of orange-tinted glow) with no flag inside it.

Preloading (`<link rel="preload" as="image">`) is already in place but it still requires a network round-trip, which is why it loses the race.

## Fix

Embed the logo directly inside `index.html` as a base64 data URI. The PNG is only ~20KB, so inlining it adds ~28KB to the HTML — negligible — and the image becomes part of the same byte stream as the splash markup. It is guaranteed to render on the very first paint, with zero network dependency. No more empty square.

### Steps

1. Base64-encode `public/rally-icon-192-v6.png`.
2. In `index.html`, replace `<img class="rally-boot-logo" src="/rally-icon-192-v6.png" ...>` with `<img class="rally-boot-logo" src="data:image/png;base64,...." ...>`.
3. Keep the existing `<link rel="preload">` line (it still helps any other component that references the same URL via the cache).
4. Leave all CSS, animations, and the `body.rally-booted` fade-out untouched.

### Out of scope

- No change to the splash design, sizing, ring/breathe animations, or fade timing.
- No change to PWA manifest icons or the actual `/rally-icon-192-v6.png` asset.
- No change to anywhere else the logo is used in the app.

## Result

The flag renders the instant the splash appears, on every load — cold, warm, slow network, or PWA launch. The "orange square" failure mode goes away.
