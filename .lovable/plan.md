# Fix: Event Type & "Pick a date" need a double-click / miss the trigger

## What's happening

In `CreateEventDialog.tsx`, there's a **sticky tab nav** (`Essentials · Details · Review`) at the top of the scrollable dialog:

```
line 330: <nav className="... sticky top-0 z-10 py-2 bg-background/95 backdrop-blur-md -mx-6 px-6">
```

It has:
- `sticky top-0 z-10`
- A solid `bg-background/95` background that spans the full dialog width (`-mx-6 px-6`)
- Three clickable section buttons inside

As the user scrolls, the **Event Type** select trigger and the **"Pick a date"** button slide *underneath* this sticky bar. Visually they look almost flush with the top of the visible area, so the user clicks where they see the trigger — but the click actually lands on the sticky nav's opaque background (or worse, on one of the three section buttons), which:

- Steals the click (nav is `z-10` over the form)
- On the section buttons, even re-scrolls the form, making it feel like "the click didn't register"

That's why it takes a second click — the first one hits the nav, the second one (after scroll settles) actually hits the trigger.

## The fix (UI only, no logic changes)

1. **Let the nav's background pass clicks through, but keep its buttons clickable.**
   On the `<nav>` (line 330): add `pointer-events-none`.
   On each `<button>` inside it (line 334): add `pointer-events-auto`.
   Result: clicks on empty nav space fall through to the trigger underneath; tab buttons still work.

2. **Give form sections a scroll offset so programmatic "scroll to section" lands below the nav.**
   On `essentialsRef`, `detailsRef`, `reviewRef` wrappers: add `scroll-mt-14` (≈ nav height).
   Result: clicking Essentials / Details / Review tabs scrolls the section into view *below* the sticky nav instead of behind it.

3. **Tighten the nav so less of the form hides behind it.**
   Change `py-2` → `py-1.5` on the nav. Minor, but reduces the dead zone.

That's it — three small className tweaks in `src/components/events/CreateEventDialog.tsx`. No changes to Popover, Select, form state, validation, or submission.

## Files touched

- `src/components/events/CreateEventDialog.tsx` (className edits only on lines ~330, ~334, ~357, ~399, and the review section wrapper)
