

# Fix: Squad Symbol Icon Turns Orange When Selected

## Problem
When selecting a squad symbol in the picker, the selected icon stays white (via `text-primary-foreground`) on the orange background. The user wants the **icon itself** to turn orange when selected, rather than having an orange background with a white icon.

## Solution
One file change in `SquadSymbolPicker.tsx` — swap the selected state styling so the icon turns orange while the button gets a subtle orange-tinted background instead of a solid primary fill.

### Changes to `src/components/squads/SquadSymbolPicker.tsx`
- **Selected state** (line 83): Change from `bg-primary text-primary-foreground border-primary` → `bg-primary/15 text-primary border-primary ring-2 ring-primary/30`
- This makes the selected icon render in the brand orange (`text-primary`) on a light orange background, clearly distinguishing it from unselected icons.

