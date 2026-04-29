## Problem

On the Admin Dashboard at iPhone widths (~360–390px), the sticky header tries to fit four things on one row:

1. Shield icon
2. "R@lly Admin" title
3. "Return to App" pill (icon-only on mobile, but still takes space + gap)
4. The segmented `partner | technical | commercial` pill

The segmented pill is pushed right with `ml-auto`, and `commercial` (the longest label) overflows past the right edge of the viewport, getting visually cut off by the screen / safe-area inset.

## Fix

Restructure the header in `src/pages/AdminDashboard.tsx` so the segmented view-mode pill drops to its own full-width row on small screens, and stays inline on `sm:` and up.

### Changes (single file: `src/pages/AdminDashboard.tsx`, header block ~lines 102–141)

1. **Row 1 (title row)** — Shield + "R@lly Admin" + "Return to App" only. Remove `ml-auto` from the segmented pill's row by extracting it.
2. **Row 2 (mobile only)** — The segmented `partner / technical / commercial` pill, rendered full-width, horizontally scrollable as a safety net (`overflow-x-auto`, `no-scrollbar`), and inline-flex so it doesn't stretch the buttons.
3. **Row 2 desktop behavior** — On `sm:` breakpoints and up, the segmented pill rejoins the title row via responsive classes (`sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2` on a wrapper, OR simpler: render it twice with `sm:hidden` and `hidden sm:flex`). Prefer the simpler "render once, change parent layout" approach using flex-wrap:
   - Use `flex flex-wrap items-center gap-3` on the row container.
   - Give the pill `w-full sm:w-auto sm:ml-auto`.
   - This lets it wrap to its own line on mobile without duplication.
4. **Date filter row** — Already on its own row (line 138); keep as-is.
5. Keep all existing classes for indicator animation, glass blur, `h-safe-top` spacer, and the active-pill sliding indicator (no logic changes — `toggleRefs` and `indicator` still work because the buttons re-mount in the same DOM order).

### Technical detail

```tsx
<div className="container py-3 sm:py-4 flex flex-wrap items-center gap-3">
  <Shield ... />
  <h1 ...>R@lly Admin</h1>
  <Link to="/" ...>...</Link>

  {/* Segmented pill: full width on mobile, right-aligned on sm+ */}
  <div className="order-3 sm:order-none w-full sm:w-auto sm:ml-auto
                  flex sm:inline-flex items-center justify-center
                  gap-1 rounded-full border border-border/50 bg-muted/40 p-1 backdrop-blur-sm
                  relative overflow-x-auto no-scrollbar">
    {/* sliding indicator + buttons unchanged */}
  </div>
</div>
```

Recompute the sliding indicator on resize is already handled by the existing `toggleRefs` measurement effect, so wrapping does not break the active-tab highlight.

### Verification

- 360×722 (current viewport): all three tabs — including "commercial" — fully visible, pill sits below the title row.
- 390×844 (iPhone 14): same.
- ≥640px (`sm:`): pill returns to the right side of the title row, matching current desktop look.
- Status-bar safe area still respected by the existing `<div className="h-safe-top" />` spacer.

## Files changed

- `src/pages/AdminDashboard.tsx` — header block only.

No memory updates required; this is consistent with the existing `mem://style/cross-platform-hardening` and `mem://style/mobile-responsiveness-patterns` rules (shrink-0, overflow control, safe areas).
