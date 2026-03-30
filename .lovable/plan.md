

# Remove scrollbar from Create R@lly dialog

## Change
In `src/components/events/CreateEventDialog.tsx`, add a CSS class or inline style to hide the scrollbar on the `DialogContent` container while keeping scroll functionality.

### File: `src/components/events/CreateEventDialog.tsx`
Add `scrollbar-hide` class (or use CSS `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) to the `DialogContent` element that has `max-h-[90vh] overflow-y-auto`.

### File: `src/index.css`
Add a utility class if not already present:
```css
.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

One CSS class addition, one className update. No functionality changes.

