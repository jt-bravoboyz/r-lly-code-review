## Problem

In the Create Event dialog, the **Event Type** dropdown and **Date** picker do nothing when clicked. The clicks are actually firing — the menus open, but they render *behind* the dialog and are invisible/unclickable.

## Root cause

A previous fix raised the dialog stacking context:
- `DialogOverlay` → `z-[200]`
- `DialogContent` → `z-[201]`

But the Radix portals for Select and Popover still use the shadcn default `z-50`:
- `src/components/ui/select.tsx` line 69 → `SelectContent` uses `z-50`
- `src/components/ui/popover.tsx` line 20 → `PopoverContent` uses `z-50`

Since `50 < 201`, the dropdown panels mount underneath the dialog and look "broken".

## Fix

Bump both portaled surfaces above the dialog layer.

1. **`src/components/ui/select.tsx`** — change `SelectContent` className from `z-50` to `z-[300]`.
2. **`src/components/ui/popover.tsx`** — change `PopoverContent` className from `z-50` to `z-[300]`.

That's it — no logic changes, no Create Event dialog edits needed. This also fixes any other Select/Popover that lives inside a Dialog (date pickers, location search, etc.).

## Verification

Open Create Event → click **Event Type** (options appear) and **Pick a date** (calendar appears) on top of the dialog.
