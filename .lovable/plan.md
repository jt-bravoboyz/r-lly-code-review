
# Fix White Top Safe-Area Strip on iPhone

## Root cause
The global CSS is still adding `padding-top: env(safe-area-inset-top)` to `body` in `src/index.css`. That pushes the entire app down and leaves the safe-area region painted by the browser/root instead of the page itself. On iPhone, that shows up as the white strip above the app until the page repaints during interaction.

## Implementation plan

### 1. Fix the global safe-area strategy in `src/index.css`
- Remove the global `body { padding-top: env(safe-area-inset-top); }`
- Make the root layout fill the screen from first paint:
  - `html, body, #root { min-height: 100%; }`
  - `html, body, #root { background: #121212; }` as the base fallback
- Keep page-level safe-area handling inside headers/screens that already use `env(safe-area-inset-top)`

This ensures the app background reaches behind the Dynamic Island immediately instead of creating a blank strip.

### 2. Preserve existing page-level safe-area spacing
Do not change page design or header structure on screens that already handle the notch correctly:
- `src/components/layout/Header.tsx`
- `src/pages/Events.tsx`
- `src/pages/Index.tsx`
- `src/pages/JoinRally.tsx`
- `src/pages/Notifications.tsx`

These already use internal top inset spacers/padding, which is the correct pattern once the global body padding is removed.

### 3. Harden first-paint background behavior
In `src/index.css`, ensure the base background color is applied before theme gradients:
- keep dark base fallback at document level
- avoid relying only on animated body gradients for first paint
- ensure the top inset area always matches the page beneath it on load

### 4. Verify no secondary offset remains
Quick code pass to confirm there is no duplicate top offset from:
- global body padding
- extra hardcoded top spacers outside page headers
- root/container background mismatch

## Expected result
- No white strip at the top on iPhone
- Safe area matches the screen background immediately on load
- No visual jump or repaint needed after dragging
- Existing layouts and styling remain unchanged

## Files to update
- `src/index.css` — remove global safe-area body padding and make document/root backgrounds fill the screen correctly

## Technical note
The correct pattern is:
- global document/root provides full-bleed background
- individual screens/headers add their own safe-area spacing
- never apply notch padding to the entire `body`, because that exposes the browser/root background above the app
