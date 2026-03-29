

# Fix: Make Search Icon Visible in Create Squad Dialog

## Problem
The magnifying glass icon next to "Search people..." is present but uses `text-muted-foreground`, which is nearly invisible against the dialog's light background.

## Solution
One line change in `src/components/squads/CreateSquadDialog.tsx`:

- **Line 98**: Change `text-muted-foreground` → `text-foreground/45` to match the app's established search bar icon styling (per existing convention).

