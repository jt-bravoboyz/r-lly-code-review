# Flag-First Loading Screen

Replace the current orange-square loader (both the inline HTML boot splash and the React handoff) with a loading screen built around the R@lly Flag. The flag is drawn as **inline SVG** so it paints on the very first frame — no image fetch, no decode, no flash.

## Composition

- **Background**: deep black `#050505`.
- **Centerpiece**: the R@lly Flag — inline SVG, ~88px wide, white pole + orange (`#F47A19`) waving banner with an `@` glyph cut into it. Sits dead-center.
- **Around the flag**: 3 concentric thin orange beacon rings pulsing outward (same `rally-beacon-ring` motion language used on `RallyFlagPin`, staggered 0s / 1.2s / 2.4s) — ties it to the in-app flag pin.
- **Behind the flag**: soft radial orange glow (`rgba(244,122,25,0.18)` → transparent) that breathes 2.2s ease-in-out.
- **Below**: nothing on first paint. After ~250ms a thin wordmark `R@lly` (Montserrat 800, `@` in orange) fades in — kept optional and lazy so the flag is always the first thing rendered.

No spinner, no progress bar, no tagline. The flag + breathing rings are the loading signal.

## Why it renders instantly

- Inline SVG in `index.html` — zero network, zero decode, paints with the first HTML chunk.
- All animation via CSS keyframes already present in the doc — no JS needed for the boot frame.
- React `AuthLoadingState` re-uses the **exact same SVG markup and class names**, so when React mounts the visual is byte-identical to the boot splash — no swap flicker.

## Files to change

1. **`index.html`** — Replace the `<img class="rally-boot-logo" src="data:image/png;base64,...">` with an inline `<svg class="rally-boot-flag">` (flag pole + banner + `@` cutout). Replace the single static ring with three staggered beacon rings. Drop the rounded-square glass wrap (that's what reads as "orange square"). Update the surrounding CSS block to size the flag, define `rally-beacon-ring`, and remove the now-unused `.rally-boot-logo-wrap` / `.rally-boot-logo` rules.

2. **`src/components/AuthLoadingState.tsx`** — Rebuild the centerpiece to mirror the new boot splash: same inline flag SVG, same three beacon rings, same radial breathe. Keep the existing `authResolved` / `minHoldMs` / `fadingOut` / `onComplete` lifecycle and the `rally-boot-splash` handoff removal untouched. Drop the progress ring, rotating beams, glass logo wrap, and the `rally-logo.png` import.

No other call sites need changes — `SplashScreen.tsx` (the "Ready. Set. R@lly." cinematic) is a separate component and stays as-is.

## Technical notes

- Flag SVG: single `<svg viewBox="0 0 64 64">` — `<rect>` pole in white, `<path>` banner in `#F47A19` with a subtle wave, `<text>` or `<path>` `@` mask in black. Roughly 1KB inline.
- Beacon-ring keyframes: scale `0.5 → 2.2`, opacity `0.9 → 0`, 3.6s ease-out infinite, three copies at 0s / 1.2s / 2.4s delay.
- Reduced-motion: when `prefers-reduced-motion: reduce`, freeze the rings and the glow at their resting state — flag stays visible.
- Accessibility: `aria-hidden="true"` on the loader; the SVG carries `<title>R@lly</title>` for screen-reader hint.
