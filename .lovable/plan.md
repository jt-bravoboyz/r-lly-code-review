

# Squads Tab — Fix Header Shift

## Root Cause

The Squads page builds its own inline header with a hardcoded `<div className="h-6" />` top spacer, while every other page uses the shared `<Header>` component which has `<div style={{ height: 'env(safe-area-inset-top, 1.5rem)' }} />`. This mismatch causes the header to sit at a different vertical position, creating the visible "jump" when navigating to Squads.

Additionally, the Squads header lacks `backdrop-blur-xl`, `border-b border-white/[0.12]`, and the consistent `shadow` styling that the shared Header uses.

## Fix

Replace the Squads page's custom inline header (lines 44-65) with the shared `<Header>` component, passing `title="Squads"` and `icon={<Users>}`. This ensures identical structure, spacing, and safe-area handling across all tabs.

## Files

| File | Change |
|------|--------|
| `src/pages/Squads.tsx` | Remove inline header block (lines 44-65), replace with `<Header title="Squads" icon={<Users className="h-5 w-5" strokeWidth={2.5} />} />`. Remove unused `Link`, `Avatar`, `AvatarImage`, `AvatarFallback`, `rallyLogo` imports if no longer needed elsewhere in the file. |

1 file, ~20 lines replaced with 1 component call.

