## Rename R@lly Tabs → R@lly Wallet

Update the `/tabs` Coming Soon screen and the Profile menu label.

### Changes

1. **src/pages/SplitCheckHome.tsx**
   - Title: `R@LLY TABS` → `R@LLY WALLET`
   - Subtitle: `Split the check. Settle the night.` → `Split the check. Pay the cover. All in one place.`

2. **src/pages/Profile.tsx** (line 691)
   - Menu label: `R@lly Tabs` → `R@lly Wallet`

### Out of scope
- Route `/tabs` and internal component/file names stay as-is (purely user-facing copy change).
- Hidden comments in `EventDetail.tsx` referencing "R@lly Tabs" can stay (dev notes, not visible).
