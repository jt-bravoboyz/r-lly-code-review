

# Fix: Low Contrast Policy Text in Dark Dialog

## Problem
The `PolicyAcceptanceDialog` has a dark background (`#1E1E1E`) but the `LegalContent` components use Tailwind theme classes (`text-muted-foreground`, `text-foreground`) which resolve to dark colors in light mode. The inline color on the wrapper div gets overridden by these more specific classes on child elements.

## Solution
Add a CSS override inside the scrollable content wrapper in `PolicyAcceptanceDialog.tsx` that forces all text within the policy viewer to use light colors, without modifying `LegalContent.tsx` (which is also used on the standalone Legal page where theme colors are correct).

### File: `src/components/legal/PolicyAcceptanceDialog.tsx`

On the content wrapper div (around line 148-155), add inline style overrides using CSS custom properties or a style block that targets descendant text:

- Change the wrapper to set `color: #E0E0E0` as the base text color
- Add a className or nested style that overrides `.text-muted-foreground` and `.text-foreground` within this specific container
- Use a wrapper `<div style={{ color: '#E0E0E0' }}>` with a `[&_.text-muted-foreground]:!text-[#E0E0E0]` and `[&_.text-foreground]:!text-[#F5F5F5]` Tailwind arbitrary variant to force light colors on all descendants
- Section headers (`h3` with `text-foreground`) get `#F5F5F5` (slightly brighter than body)
- Body text (`text-muted-foreground`) gets `#E0E0E0` (soft but legible)
- Strong tags with `text-foreground` get the same bright treatment

### No other files changed
- `LegalContent.tsx` — untouched (used correctly on the standalone Legal page)
- Checkbox text, button, headers — untouched
- Orange/green section headers come from `text-foreground` on `h3` but within LegalSection they use `uppercase` styling — these will get the light treatment too since they use `text-foreground`. If the user's screenshot shows them as orange/green, that may be from `text-primary` — will verify and preserve.

### Verification
All 5 policy documents use the same `LegalSection` component, so the fix applies universally across the dropdown.

