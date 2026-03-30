

# Make Create R@lly Dialog Theme-Aware (Light/Dark)

## Problem
The Create R@lly dialog has hardcoded dark backgrounds in CSS (`.rally-create-inner`, `.rally-create-input`) and inline styles (nav bar `bg-[hsl(0_0%_8%/0.95)]`), so it always looks dark even in light mode.

## Changes

### 1. File: `src/index.css` — Add light-mode variants for Create R@lly styles

- **`.rally-create-glow-wrapper`**: Keep as-is (orange glow works in both modes)
- **`.rally-create-inner`**: Change the current dark gradients to be scoped under `.dark .rally-create-inner`. Add a new default `.rally-create-inner` with white/warm-white background, lighter box-shadow
- **`.rally-create-input`**: Change current dark styles to `.dark .rally-create-input`. Add default light-mode `.rally-create-input` with white/light-gray background and subtle warm borders

### 2. File: `src/components/events/CreateEventDialog.tsx` — Fix hardcoded dark nav background

- Line 230: Change `bg-[hsl(0_0%_8%/0.95)]` to `bg-background/95` so it uses the theme's background color
- Text colors already use `text-foreground`, `text-muted-foreground`, `text-primary` which are theme-aware, so those are fine

### Summary of CSS additions

**Light mode (default):**
- `.rally-create-inner`: white gradient background, light shadow
- `.rally-create-input`: light gray background, warm border
- `.rally-create-input:focus`: orange focus ring (same as dark)

**Dark mode (`.dark` prefix):**
- Keep existing dark styles as-is, just scope them under `.dark`

