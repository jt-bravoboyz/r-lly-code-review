# Military-Grade Bronze · Silver · Gold Medal Redesign

Rework the Bronze, Silver, and Gold tier badges in `src/components/badges/TierBadgeIcon.tsx` so they read like real military medals — circular medallions with a fluted sunburst rim, embossed laurel + star center, and a hanging suspension ribbon — finished with a brighter, faster polished-metal shimmer that glints across the surface like light catching real metal.

## Visual Anatomy (each medal)

```text
       ┌────┐        ← suspension ribbon (vertical stripes)
      ┌┘    └┐
   ┌──┴──────┴──┐    ← fluted sunburst outer rim
   │  ╭─────╮  │
   │  │ ★   │  │    ← inner medallion: laurel wreath + embossed star
   │  ╰─────╯  │
   └────────────┘
```

- **Suspension ribbon** at the top: tier-themed colors (Bronze = brown/orange, Silver = slate, Gold = crimson — classic Olympic/military convention) with subtle vertical stripes.
- **Fluted rim**: outer ring with 12 small triangular ticks at clock positions for the "stamped sunburst" feel.
- **Inner medallion**: rich radial gradient (light highlight at upper-left → deep shadow at lower-right) that sells the metallic curvature.
- **Laurel wreath**: two curved branches with leaf clusters framing the star.
- **Embossed 5-point star** centered with a soft inner highlight + dark hairline stroke.
- **Specular highlight**: soft white ellipse top-left of the medallion to mimic a real light source.

## Metallic Color Stops

- **Bronze** — `#FFD8A8 → #E08A4E → #A85024 → #6B2E14 → #3A1808` with brown ribbon.
- **Silver** — `#FFFFFF → #E8EEF5 → #9AA4B8 → #5A6478 → #2C3340` with slate ribbon.
- **Gold** — `#FFF6C4 → #FFD24A → #D9871A → #8A4E08 → #3F2304` with crimson ribbon.

These deeper shadow stops are what makes them read as struck metal instead of flat colored discs.

## Shimmer Upgrade

Today every tier shares one slow `animate-badge-shimmer` (5s linear sweep at 25% opacity). For the metal medals we add a second, brighter, faster sweep on top — only for `bronze`, `silver`, `gold` — so the highlight visibly glints across the polished surface.

- New keyframe `badge-medal-glint` in `src/index.css`: a 3.5s diagonal sweep with a tighter, brighter band (`rgba(255,255,255,0.55)` peak, `screen` blend mode for hot highlight).
- New utility class `.animate-badge-medal-glint`.
- In `TierBadgeIcon.tsx`, render an additional shimmer layer when `tierKey` is bronze/silver/gold — placed above the existing one with `mix-blend-mode: screen` so it brightens the metal instead of overlaying flatly.

The existing shimmer stays for all other tiers untouched.

## Files To Edit

- `src/components/badges/TierBadgeIcon.tsx` — rewrite the three emblem SVG strings (bronze, silver, gold); add the second medal-glint layer for those three tiers.
- `src/index.css` — add `@keyframes badge-medal-glint` + `.animate-badge-medal-glint` next to the existing badge animations.

No new dependencies. No props or API changes. All other tiers (emerald → dark_matter) are untouched.