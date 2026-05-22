## Plan

### 1. Replace fetch-then-merge with native upsert in `src/hooks/useUserContacts.tsx`

The current `useUpsertUserContacts` mutation does a SELECT-then-UPDATE/INSERT loop. Since the DB already has unique constraints `user_contacts_owner_phone_unique (owner_id, phone)` and `user_contacts_owner_email_unique (owner_id, email)`, we can collapse it to two `.upsert()` calls.

Replace the body of `mutationFn` (after the `normalized` filter) with:

```ts
const rows = normalized.map(c => ({
  owner_id: profile.id,
  name: c.name,
  phone: c.phone,
  email: c.email,
  source: c.source,
  last_synced_at: new Date().toISOString(),
}));

const withPhone = rows.filter(c => c.phone !== null);
const emailOnly = rows.filter(c => c.phone === null && c.email !== null);

let allData: any[] = [];

if (withPhone.length > 0) {
  const { data, error } = await supabase
    .from('user_contacts')
    .upsert(withPhone, { onConflict: 'owner_id,phone', ignoreDuplicates: true })
    .select();
  if (error) throw error;
  if (data) allData = allData.concat(data);
}

if (emailOnly.length > 0) {
  const { data, error } = await supabase
    .from('user_contacts')
    .upsert(emailOnly, { onConflict: 'owner_id,email', ignoreDuplicates: true })
    .select();
  if (error) throw error;
  if (data) allData = allData.concat(data);
}

return allData;
```

Removes ~80 lines of merge logic. `ignoreDuplicates: true` matches your snippet — re-syncs skip rows that already exist instead of bumping `last_synced_at`. (Note: this is a behavior shift from today's merge — flag if you'd rather keep `merge-duplicates` to refresh names/source.)

Also update the `mem://architecture/contact-sync-architecture` memory to reflect the new strategy.

### 2. Hide web-only import paths on native in `src/components/contacts/AddPeopleSheet.tsx`

Compute `const isNative = Capacitor.isNativePlatform();` once at the top of the component, then on native:

- Skip rendering the `<Tabs>` block (Contact Card / Quick Paste / CSV) entirely.
- Keep on native: search input, R@lly Friends list, Quick Add, Cloud `ContactSmartSearch`, and the "Phone / Computer Contacts" device-sync button.
- On web: leave everything as-is.

Also tighten the device button label on native to "Sync iPhone Contacts" (drop the "Phone / Computer" web framing).

### Files touched

- `src/hooks/useUserContacts.tsx` — rewrite upsert path
- `src/components/contacts/AddPeopleSheet.tsx` — gate Tabs block behind `!isNative`
- `mem://architecture/contact-sync-architecture` — update memory

No DB, RLS, or edge function changes.
