

# Notifications — Content Simplification

## Changes

### 1. Remove System Status Bar (lines 102–116)
Delete the entire sticky status bar block (green dot, "R@lly System Active", "Last sync" text). Also remove the `lastSync`/`syncAgo` state and effect since they're no longer needed.

### 2. Simplify Anticipation Card (lines 211–228)
Replace the current two-line layout (icon + title + subtitle) with a single centered bold line:

**"Be the one to get things started"**

- Remove the Zap icon circle and the "Your squad hasn't made a move yet tonight" line
- Make the remaining text `text-base font-bold text-foreground text-center`
- Keep the "Start a R@lly" button directly below with proper spacing

### 3. Unchanged
- All glass effects, glow, background orbs, icon breathing animation
- "You're locked in" section
- Motion system, layout structure, BottomNav

## Files

| File | Change |
|------|--------|
| `src/pages/Notifications.tsx` | Remove status bar block + `lastSync`/`syncAgo` state; simplify anticipation card content |

1 file, surgical content removal only.

