

# Fix Top Safe-Area White Gap

## Root Cause
Line 19 in `src/index.css`: `padding-top: env(safe-area-inset-top);` on `body` pushes all content down, exposing a white gap above the app. Individual page headers already handle safe-area insets themselves, making this global padding redundant.

The `html` background is already set to `#121212` (line 15), but the body padding creates a visible gap before the page content begins.

## Fix

### `src/index.css` — remove line 19
Remove `padding-top: env(safe-area-inset-top);` from the `body` rule.

No other changes. No colors, layout, or styling modified.

| File | Change |
|------|--------|
| `src/index.css` | Remove `padding-top` from body (line 19) |

1 file, 1 line removed.

