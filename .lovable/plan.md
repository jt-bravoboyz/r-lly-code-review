

# Emergency UI Cleanup — Remove Modal Clutter

## What We're Doing
Restructuring the "Add People" sheet and invite dialog so users see only a search bar when they open it. Technical import options get tucked away. The Manual R@lly quick-add row becomes the primary invite path.

## Changes

### 1. `src/components/contacts/AddPeopleSheet.tsx`
- Remove the always-visible "Phone / Computer Contacts" button and VCF/Paste/CSV tabs from the main view
- Keep `ContactSmartSearch` at the top as the sole primary element
- Add the Manual R@lly Quick Add row (replicating ContactsTab logic): when search has no matches and user typed something, show the orange-tinted pulsing card ("R@lly [number]" or "Invite '[name]' via Text")
- Add iOS disclaimer note below search: "Apple limits contact syncing on web apps. Type any name or number above to send an invite link manually."
- Add a collapsed "Import Options" outline button at the bottom that toggles open the device sync button + VCF/Paste/CSV tabs
- Update SMS copy in the onInvite handler to use the branded R@lly voice
- Pass `autoFocus` to ContactSmartSearch
- Import `useAuth` for referral link generation

### 2. `src/components/contacts/ContactSmartSearch.tsx`
- Add `autoFocus?: boolean` prop, forwarded to the `<Input>` element
- No other changes

### 3. `src/components/contacts/ContactInviteDialog.tsx`
- Add `autoFocus` to the search input (via `useEffect` on open)
- In the empty state, replace prominent `ContactSyncButton` + `CSVContactImport` with a single "Import Options" collapsible
- In the no-results state, add the same Manual R@lly Quick Add row (orange pulsing card)

## Files Modified
- `src/components/contacts/AddPeopleSheet.tsx`
- `src/components/contacts/ContactSmartSearch.tsx`
- `src/components/contacts/ContactInviteDialog.tsx`

No database, useUserContacts, squad media, or event changes.

