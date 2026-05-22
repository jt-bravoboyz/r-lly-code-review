# Preview WelcomeBackOverlay as MP4

The overlay is gated to `Capacitor.isNativePlatform()` and once-per-session, so it won't render in the web preview. I'll generate a faithful MP4 of the animation using Remotion so you can see the motion without a native build.

## Beat sheet (1.2s @ 30fps = 36 frames)

- **0–6f** — Black `#0A0A0A` with ambient orange radial fades in
- **3–10f** — Horizontal light sweep crosses the midline
- **6–18f** — "Welcome back" eyebrow fades up
- **8–22f** — R@lly wordmark assembles; orange `@` swoops in from upper-left with glow pulse (0–12–42px blur)
- **22–30f** — Settled hold with subtle glow breathing
- **30–36f** — Exit drift up + fade out

## Steps

1. Scaffold `remotion/` workspace (gitignored, not project source). Install Remotion + apply the musl compositor fix per sandbox conventions.
2. Port `WelcomeBackOverlay.tsx` frame math 1:1 into a single composition on a 9:16 mobile canvas (1080×1920). Same easing curves, same colors (`#0A0A0A` bg, `#F47A19` `@`, white 95% wordmark, ambient radial, light sweep, `@` swoop, glow pulse, exit drift).
3. Load Montserrat ExtraBold via `@remotion/google-fonts/Montserrat`.
4. Spot-check stills at `--frame=12` (eyebrow + sweep) and `--frame=22` (`@` settling with glow) before the full render to confirm typography + glow look right.
5. Render to `/mnt/documents/welcome-back.mp4` using the programmatic render script (`chromeMode: 'chrome-for-testing'`, `muted: true`, concurrency 1).
6. Deliver as `<presentation-artifact>` so you can scrub/download inline.

## Out of scope

- No edits to `src/components/WelcomeBackOverlay.tsx` or any project source
- No GIF export, no audio
- No new route or web-side preview gating bypass

## Validation

- File exists at `/mnt/documents/welcome-back.mp4`, runtime ≈ 1.2s, 9:16
- Frame 0 = pure black, frame ~12 = eyebrow + sweep visible, frame ~22 = `@` mid-swoop with orange glow, frame ~30 = wordmark settled, frame ~35 = faded out
