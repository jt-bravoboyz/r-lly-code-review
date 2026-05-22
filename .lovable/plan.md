## Goal

Replace the native "Welcome Back" splash that flashes when returning users reopen the app on iOS. Current overlay layers a blurred orange disc behind `/logo.svg`, which reads muddy and has a visible asset artifact. Energy doesn't match the first-time `SplashScreen` cinematic entrance the brand is built around.

Web build stays untouched — overlay is already gated by `Capacitor.isNativePlatform()`.

## What changes

**File:** `src/components/WelcomeBackOverlay.tsx` (full rewrite of render + animation, contract unchanged)

- **Remove**: `/logo.svg` image, the radial orange `blur-2xl` disc behind it, the static "R@lly" text label, and the gentle scale pulse keyframes.
- **Replace with**: a compressed (~1.0s) version of `SplashScreen`'s cinematic entrance, tuned for a returning-user "drop back in" moment rather than a first-impression reveal.

### Cinematic beat sheet (total ~1.1s, capped by existing `MAX_DURATION_MS`)

```text
0.00s  Pure #0A0A0A black. Ambient orange radial begins fading in (peaks ~14% opacity).
0.05s  Thin light sweep traverses the horizontal midline (peaks ~0.2 alpha).
0.15s  "Welcome back," fades up (small caps, white/70, Montserrat).
0.35s  "R" + "lly." fade in centered.
0.40s  "@" swoops in from upper-left (translate + scale 0.7→1.0), R@lly Orange, with a textShadow glow that peaks then settles.
0.85s  Hold the wordmark — subtle 1px breathing.
0.95s  Whole stack fades + drifts up 8px. Overlay unmounts at 1.2s.
```

### Visual specs

- Background: `#0A0A0A` (matches first-run splash, not the prior `#0F172A` navy).
- Ambient: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(244,122,25,0.14), transparent 70%)`.
- Wordmark: `font-montserrat font-extrabold text-6xl tracking-tight`, white 95% with `@` in `#F47A19` and orange glow `0 0 12–42px rgba(244,122,25,0.3–0.65)`.
- Eyebrow line: `text-sm tracking-[0.22em] uppercase text-white/65 font-montserrat`.
- Safe areas: keep `safe-top safe-bottom`, `fixed inset-0 z-[100]`.
- Motion: pure CSS `@keyframes` injected inline (no framer-motion dep), `prefers-reduced-motion` collapses to a static fade.

### Contract preserved

- `MAX_DURATION_MS = 1200`, `FADE_MS = 280`, `SESSION_KEY = 'rally-welcome-back-shown'` all unchanged.
- Native-only gate (`Capacitor.isNativePlatform()`) unchanged.
- Once-per-session `sessionStorage` lock unchanged.
- Component is still self-mounting from wherever it's already rendered (no consumer changes).

## Out of scope

- `ReturningAuth.tsx` (the sign-in form).
- First-run `SplashScreen.tsx`.
- Any DB / auth / business logic.
- Web/PWA welcome flow.

## Validation

- Trigger overlay in iOS simulator: confirm no `logo.svg` artifact, no halo disc, wordmark animates cleanly, total runtime ≤1.2s.
- Resume app in same session: overlay does not re-fire (sessionStorage gate).
- Web preview: overlay stays invisible.
- `prefers-reduced-motion: reduce`: wordmark appears statically, still fades out.
