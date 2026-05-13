## Problem

In `CreateEventDialog`, the **Date** field's "Pick a date" button does nothing when tapped. Confirmed in the preview: clicks land on the button but the calendar Popover never opens, and there are no console errors.

Root cause: a Radix `Popover` is being rendered inside a Radix `Dialog`, with the trigger nested as `PopoverTrigger > FormControl > Button` (Slot inside a Slot). In this combination the trigger's `onClick` doesn't reliably toggle the popover's open state, so the calendar never appears.

Other date editors in the app (e.g. `EditEventTimeDialog`) use a plain `<input type="date">` / `datetime-local` and work fine — including in mobile/PWA where it pops the OS-native picker, which is what users expect on this app.

## Fix

Replace the Popover + Calendar date picker in `CreateEventDialog.tsx` (around lines 401–442) with a native date input wired to the same `react-hook-form` field. No other behavior changes.

```text
Date
┌──────────────────────────────────────┐
│  📅  2026-05-20                      │  ← native input (opens OS picker)
└──────────────────────────────────────┘
```

### Technical detail

- Keep the `FormField name="date"` and `eventSchema` (`z.date()`) as-is.
- Render an `<Input type="date">` inside `FormControl`, styled to match the existing button (full width, rounded, glass styling, calendar icon).
- Convert between `Date` (form value) and the input's `yyyy-MM-dd` string with the same helpers used elsewhere (`format(d, 'yyyy-MM-dd')` ↔ `new Date(value)`).
- Set `min={format(new Date(), 'yyyy-MM-dd')}` so past dates are blocked (parity with the current `disabled` rule on the calendar).
- Remove the now-unused `datePickerOpen` state, `Popover/PopoverTrigger/PopoverContent`, and `Calendar` imports from this file only.
- Do not touch `EditEventTimeDialog`, `TimelineSlider`, or any other component.

## Out of scope

- Time picker (the `TimelineSlider` below it works fine).
- Any other Popover-in-Dialog usages elsewhere in the app.
- Visual redesign of the field beyond matching the current input styling.