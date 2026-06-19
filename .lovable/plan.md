We should replace the loader’s current app-icon image (`/rally-icon-192-v6.png`) with the actual standalone flag source (`/rally-icon-source.png`). The current file is a full orange square icon, which is why the loading screen still appears as an orange block.

Plan:
1. Update the inline boot splash in `index.html`
   - Change the loader image from `/rally-icon-192-v6.png` to `/rally-icon-source.png`.
   - Preload `/rally-icon-source.png` with high priority.
   - Keep `decoding="sync"` and fixed 96px dimensions so it paints immediately and doesn’t shift.

2. Update the React auth loader in `src/components/AuthLoadingState.tsx`
   - Use the same `/rally-icon-source.png` image.
   - Keep the same size, animation timing, beacon rings, and dark background so the handoff stays seamless.

3. Preserve the app icon everywhere else
   - Leave the manifest, Apple touch icon, favicon, and app/PWA icons alone.
   - Only the loading screen changes from the orange square to the real transparent R@lly flag.

4. Verify visually
   - Confirm the loader shows the standalone white R@lly flag, centered, with no orange square background.