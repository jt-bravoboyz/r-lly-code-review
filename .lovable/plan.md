

# Fix Manual Invite Trigger & Smooth UI

## Summary
Fix the SMS trigger to use `window.location.href` instead of `window.open` (avoids popup blockers), replace aggressive `animate-pulse` with a subtle fade-in, and add the Quick Add row to AddPeopleSheet with a local search input matching the exact styling of ContactSmartSearch.

## Changes

### 1. `src/components/contacts/ContactInviteDialog.tsx`
- **Fix SMS trigger** (lines 127-147): Replace all `window.open(...)` calls with `window.location.href = ...` for `sms:` intents so they fire immediately without popup blocker interference
- **Smooth animation** (line 205): Replace `animate-pulse hover:scale-[1.02]` with `animate-in fade-in duration-500 hover:scale-[1.01] transition-all`
- **Pin Quick Add above ScrollArea** (move lines 201-217 out of ScrollArea, between the search section and ScrollArea)
- **Hide empty state while typing** (line 225): Add `&& trimmed.length === 0` so the "Nobody to r@lly?" state disappears when user types anything

### 2. `src/components/contacts/AddPeopleSheet.tsx`
- **Add local search input** with Quick Add row, replacing `ContactSmartSearch` as the primary element
- The local `<Input>` will use the exact same styling as ContactSmartSearch: `pl-9` padding, `rounded-xl` border-radius, `Search` icon with `absolute left-3 top-1/2 -translate-y-1/2`, and `"Search your contacts…"` placeholder — ensuring seamless visual consistency
- **Quick Add row**: When the typed text has no matches in `useUserContacts`, show the orange-tinted row with `animate-in fade-in duration-500 hover:scale-[1.01] transition-all`
- **SMS trigger**: Use `window.location.href` for the `sms:` intent
- **Move ContactSmartSearch** into the collapsible "Import Options" section so cloud contact search remains accessible but not prominent
- Keep iOS disclaimer and Import Options collapsible as-is

### 3. Input Styling Parity
The local `<Input>` in AddPeopleSheet will exactly match `ContactSmartSearch`:
- `<Search>` icon: `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`
- `<Input>`: `pl-9` class, placeholder `"Search your contacts…"`, `autoFocus`
- Wrapping `<div className="relative">`

## Files Modified
- `src/components/contacts/AddPeopleSheet.tsx`
- `src/components/contacts/ContactInviteDialog.tsx`

No database, useUserContacts, squad media, or event changes.

