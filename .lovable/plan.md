# Founder Medal — Two-Tone Ribbon

The current `MiniFounderGem` is purple-on-purple (orange ribbon + purple coin would read as a real medal, not a blob). Swap **only the ribbon gradient** to R@lly Orange so the coin pops.

## Change

In `src/components/badges/MiniFounderGem.tsx`, replace the ribbon `linearGradient` (`id="mfgRibbon"`) with a 5-stop orange ribbon featuring a deep center stripe (military-ribbon convention):

```text
edge → stripe → highlight → deep center → highlight → stripe → edge
#A33F00 → #F47A19 → #FFB066 → #7A2A00 → #FFB066 → #F47A19 → #A33F00
```

Everything else stays identical:
- Purple metallic coin (radial purple → deep purple).
- Purple rim, engraved inner ring, white star with glow, top specular, shimmer sweep, drop shadow.

## Result

Orange ribbon + purple coin = clear two-tone medal silhouette at 18×22, on-brand (R@lly Orange is the primary token), and no longer reads as a purple blob.

## Files

- `src/components/badges/MiniFounderGem.tsx` (1 gradient block, ~8 lines)
