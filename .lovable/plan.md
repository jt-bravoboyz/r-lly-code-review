## Goal

Make the R@lly logo appear literally as soon as the screen comes — on the browser's first paint, before React mounts, before `main.tsx` even runs.

## Why the current setup feels delayed

Even with preloading, the full chain today is:
1. Browser parses `index.html`
2. Browser downloads + parses `main.tsx` and its module graph (React, providers, etc.)
3. React mounts `App` → renders `Index` → renders `AuthLoadingState`
4. Only then does the logo + ring paint

On a cold load (especially in dev / first visit), steps 1–3 can take 200–600ms of blank screen. No amount of image preloading inside React fixes that — the JS itself has to boot.

## The fix: inline boot splash in `index.html`

Render a minimal static version of the activation screen directly inside `<body>` so it paints on the very first frame using only HTML + inline CSS + an already-cached image from `/public`.

### What gets added to `index.html`

1. **Inline `<style>` in `<head>`** with:
   - `#rally-boot-splash` styles: fixed full-screen, black background, flex-centered
   - Keyframes for the pulse ring and logo breathe
   - A `body.rally-booted #rally-boot-splash` rule that fades it out

2. **`<link rel="preload" as="image" href="/rally-icon-192-v6.png" fetchpriority="high">`** so the logo bitmap is requested in parallel with the HTML parse (the asset already lives in `public/`).

3. **Inline `#rally-boot-splash` markup inside `<body>`** (before `<div id="root">`):
   - Wrapper div
   - Pulse ring div (orange border, infinite scale animation)
   - Logo `<img src="/rally-icon-192-v6.png">` with the same breathing animation

### How React tears it down

`src/components/AuthLoadingState.tsx` already controls when the loading state ends. When its `fadingOut` step fires, it adds `document.body.classList.add('rally-booted')`. The inline CSS fades the splash out over ~250ms and then `display: none` so it's gone from the layer stack.

Because React's `AuthLoadingState` paints in the same spot with the same visual language (logo + orange ring), the handoff is invisible — the user sees one continuous activation moment.

## Technical details

- **Asset choice:** use `/rally-icon-192-v6.png` (already in `public/`, already preloaded by the manifest, already used as the apple-touch-icon — guaranteed cached on repeat visits).
- **No JS in the splash:** purely HTML + CSS so it works before any script executes.
- **No layout shift:** splash is `position: fixed; inset: 0; z-index: 100` matching `AuthLoadingState`.
- **Reduced motion:** wrap the keyframe animations in `@media (prefers-reduced-motion: no-preference)`.
- **Cleanup:** `AuthLoadingState`'s existing `onComplete` callback adds `rally-booted` to `<body>`; after the 250ms fade, a tiny inline script removes the splash node entirely to free the layer.

## Files to change

- `index.html` — add preload link, inline `<style>`, inline `#rally-boot-splash` markup
- `src/components/AuthLoadingState.tsx` — on `fadingOut`, add `rally-booted` class to `<body>`; on unmount, remove the inline splash node if still present

## What stays the same

- The cinematic React `AuthLoadingState` (rings, beams, progress) — unchanged
- Auth logic, routing, `useAuth`, `Index.tsx` flow — untouched
- Brand orange, logo asset, motion language — identical
