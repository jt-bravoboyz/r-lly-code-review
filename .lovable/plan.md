

# Manual R@lly Quick Add — Updated Plan

## Summary
Add a "Quick Add" row to ContactsTab for manual invites when no contacts match, with a subtle pulse + hover scale animation to make it feel alive.

## Changes — `src/components/squads/ContactsTab.tsx` only

### 1. Quick Add Row (below search bar, above ScrollArea)
- Detect if `searchQuery` is a phone number (10+ digits after stripping non-numeric)
- Check if any filtered results exist across friends, squads, phone contacts, cloud contacts
- If `searchQuery.trim().length > 0 && !hasMatches`:
  - Phone number → "R@lly [formatted number]"
  - Name → "Invite '[name]' via Text"
- Tapping calls `handleInviteToApp` (Smart Merge + branded SMS copy)

### 2. Animation
- Apply `animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]` (subtle pulse) to the Quick Add card
- Add `hover:scale-[1.02] transition-transform duration-200` for interactive hover feel
- Card styled with `bg-[#F47A19]/10` tint and orange left border accent

### 3. iOS Web App Note
- Below search bar: `text-xs text-muted-foreground` note: "Apple limits contact syncing on web apps. Type any name or number above to send an invite link manually."

### 4. No-Match Detection
- `hasMatches = filteredFriends.length > 0 || filteredSquads.length > 0 || filteredPhoneContacts.length > 0 || filteredCloudContacts.length > 0`

### Files Modified
- `src/components/squads/ContactsTab.tsx` only

No changes to database, useUserContacts, squad media, events, or other files.

