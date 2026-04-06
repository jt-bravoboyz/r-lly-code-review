

# R@lly Remix: Invite UI & Voice Update

## Summary
Update the invite buttons across ContactsTab and ContactInviteDialog to use R@lly brand voice, orange SMS buttons with MessageCircle icon, alphabetical grouping for cloud contacts, and track invites before opening SMS.

## Changes

### 1. `src/components/squads/ContactsTab.tsx`
- Change `MessageSquare` import to `MessageCircle`
- Update `handleInviteToApp` SMS copy to: `"Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: [referral link]"` — requires importing `useAuth` to get `profile.id` for the referral param
- Change invite buttons from outline variant to solid R@lly orange (`bg-[#F47A19] hover:bg-[#F47A19]/90 text-white border-0`) with `MessageCircle` icon
- Change button label from "Invite" to "R@lly Them"
- Update empty state text for phone contacts to: "Nobody to r@lly? Try syncing your contacts."
- For Cloud Contacts section: group contacts alphabetically with bold `font-montserrat` letter headers (A, B, C...)
- Update cloud contact empty state similarly

### 2. `src/components/contacts/ContactInviteDialog.tsx`
- Change `Send` icon to `MessageCircle` from lucide-react
- Update SMS message copy (line 98) to the new voice: `"Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: [link]"`
- Change bottom CTA button label from "Invite X Contacts" to "R@lly Them" (or "R@lly X Contacts")
- Style the CTA with solid `bg-[#F47A19]` orange + white icon
- Update empty state text to: "Nobody to r@lly? Try syncing your contacts."
- Update no-results text similarly

### 3. Tracking Integration
- In `ContactsTab.handleInviteToApp` and `ContactInviteDialog.handleSendInvites`: before opening the SMS intent, call the existing `useUpsertUserContacts` merge logic to ensure the contact is saved/merged in `user_contacts`
- This ensures the contact is persisted via the Smart Merge flow before the SMS app opens

### 4. Alphabetical Grouping (Cloud Contacts in ContactsTab)
- Group `filteredCloudContacts` by first letter of name
- Render letter headers with `font-montserrat font-bold` styling between groups

## Files Modified
- `src/components/squads/ContactsTab.tsx` — brand voice, icon, button style, alphabetical headers, empty state
- `src/components/contacts/ContactInviteDialog.tsx` — brand voice, icon, button style, empty state

No changes to useUserContacts logic, squad media, event flows, or database schema.

