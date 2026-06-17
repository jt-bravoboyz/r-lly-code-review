## Problem

On Step 6 of the walkthrough, the `SplitCheckPreview` mini-frame is taller than the modal can comfortably show on a 390px viewport — the final orange split summary overlaps or pushes past the receipt rows, and the modal's Continue button gets crowded.

The frame is currently `h-[260px]` with the receipt absolutely positioned at the top and the summary absolutely positioned at the bottom — at small text sizes they collide once all 4 item rows are visible.

## Fix (single file: `src/components/tutorial/SplitCheckPreview.tsx`)

Tighten the vertical footprint so the whole simulation fits inside ~210px:

1. **Frame height**: `h-[260px]` → `h-[210px]`.
2. **Outer container padding**: `p-3 my-4` → `p-2.5 my-3` to reclaim modal margin.
3. **Receipt density**:
   - Header strip padding/margin: `pb-2 mb-2` → `pb-1.5 mb-1.5`.
   - Item row padding: `py-1.5` → `py-1`.
   - Item font size: `text-[11px]` → `text-[10.5px]`.
   - Avatar circle reserved width: `w-[34px]` → `w-[28px]` and avatar size `16` → `14`.
4. **Summary bar**:
   - Padding: `p-2` → `p-1.5`.
   - Avatar size: `12` → `14` (still smaller than receipt avatars, but readable).
   - Name `text-[10px]` → `text-[9px]`, amount `text-[11px]` → `text-[10px]`.
5. **Inset gutters**: `inset-3` → `inset-2` on receipt and `bottom-3 left-3 right-3` → `bottom-2 left-2 right-2` on the dialog/summary/new-tab pill so content has more usable height.
6. **Pre-drop avatar row**: `top-1` → `top-0.5`, gap `gap-1` unchanged.

No timing changes, no structural changes, no other files touched. Total sequence still ~5s, hold on final frame.

## Acceptance

- On a 390×645 viewport, the entire preview (label + frame + final summary) fits inside the walkthrough modal without scrolling or clipping.
- All animation phases still trigger at the same timestamps.
- No other previews, steps, or files are touched.
