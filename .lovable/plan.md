## Remove Founding Member banner

Remove the `FoundingMemberBanner` component from the home page entirely. Founding member status, badges, `founder_number`, and the medal gem stay untouched — only the banner UI is removed.

### Changes
1. **Find usage** — `FoundingMemberBanner` is rendered on the home page (likely `src/pages/Index.tsx`). Remove the import and the `<FoundingMemberBanner />` JSX.
2. **Delete the component file** — `src/components/onboarding/FoundingMemberBanner.tsx` (no longer referenced).
3. **Leave alone**: `profile.founding_member`, `profile.founder_number`, `MiniFounderGem`, `FounderBadgeCard`, `useFounderIds`, admin Founder panel, and the `rally-founding25` localStorage flag (still used elsewhere for onboarding/referral logic).

No DB changes. No badge changes.