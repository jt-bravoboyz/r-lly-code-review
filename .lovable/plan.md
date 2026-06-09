## Plan

Fix the visible spacing issue in the animated `R@lly` splash text by keeping the brand word as one cohesive inline unit instead of visually separating `R`, `@`, and `lly`.

## Changes

- Update `src/components/SplashScreen.tsx` so the final `R@lly.` line uses a stable inline layout with no browser-inserted visual gaps.
- Keep the existing animation behavior: `@` still swoops in, while `R` and `lly.` fade in.
- Remove/override tight tracking on the final brand word so Montserrat does not create odd optical spacing around the `@` symbol.
- Preserve the current timing, colors, glow, and exit animation.

## Validation

- Check the splash screen visually in the preview and confirm `R@lly` reads as a connected brand name with no weird spaces.