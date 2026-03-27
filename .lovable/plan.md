

# Opening Animation — Pulsing "@" Core Redesign

## Concept
Invert the animation order: the orange "@" appears first as a living, pulsing energy core at screen center. "Ready." and "Set." build around it. At peak energy, the remaining letters R, L, L, Y resolve outward from the "@", forming the full word.

## Phases & Timing (Total: ~5.5s)

### Phase 1 — "@" Activation (0.0–1.2s)
- Screen opens near-black (`#0A0A0A`)
- Orange "@" fades in at center (0.0–0.4s)
- Begins a slow, smooth pulsing glow cycle (~1.5s period)
- Each pulse slightly stronger than the last (intensity ramps from 0.3 → 0.6)
- No movement — only opacity + textShadow radius changes
- Ambient radial gradient synced to pulse intensity

### Phase 2 — "Ready." (1.2–2.2s)
- "Ready." fades in above the "@" / R@lly line (separate row)
- "@" continues pulsing underneath
- Text locks in place immediately — no movement after fade

### Phase 3 — "Set." (2.2–3.2s)
- "Set." fades in between "Ready." and the R@lly row
- "@" pulse intensity increases slightly (0.6 → 0.75)
- Both words remain stable

### Phase 4 — R@lly Formation / Hero Moment (3.2–4.6s)
- "@" reaches peak glow (intensity → 1.0) at ~3.4s
- At peak: "R" fades in to the left, "lly." fades in to the right
- Letters resolve outward from center with very subtle horizontal spread (2-3px transform, not dramatic)
- A single horizontal light pass sweeps across the full "R@lly." word
- "@" glow settles to a warm steady state after peak

### Phase 5 — Full Phrase Hold (4.6–5.2s)
- All three lines visible: "Ready." / "Set." / "R@lly."
- Everything stable, no motion — pure reading time

### Phase 6 — Exit Transition (5.2–5.5s)
- Content fades with slight upward drift
- Background glow softens
- `onComplete()` fires at 5500ms

## Technical Approach

### `src/components/SplashScreen.tsx` — Full rewrite
- Same `requestAnimationFrame` + elapsed-time architecture
- "@" pulse: `textShadow` radius oscillates using `Math.sin(elapsed * pulseSpeed)` with ramping amplitude
- Ambient glow div synced to pulse via shared intensity variable
- "R" and "lly." use subtle `translateX` (±3px → 0) during their 0.3s fade-in, then lock
- No extra text, no tagline — only "Ready. Set. R@lly."

### `src/components/AppEntry.tsx` — Duration update
- Change `duration={5000}` → `duration={5500}`

## Files

| File | Change |
|------|--------|
| `src/components/SplashScreen.tsx` | Full rewrite — "@" starts first as pulsing core, letters form around it |
| `src/components/AppEntry.tsx` | Update duration to 5500 |

2 files changed.

