

# Fix Database Constraint Error in Contact Sync

## Problem
The `user_contacts` table is missing a UNIQUE constraint on `(owner_id, phone)`, which the upsert in `useUserContacts.tsx` references via `onConflict: 'owner_id,phone'`. Similarly, `phone_contacts` is missing a UNIQUE constraint on `(profile_id, phone_number)` referenced in `usePhoneContacts.tsx`.

## Changes

### 1. Database Migration — Add missing UNIQUE constraints

```sql
-- user_contacts: needed by useUpsertUserContacts
CREATE UNIQUE INDEX IF NOT EXISTS user_contacts_owner_id_phone_key
  ON public.user_contacts (owner_id, phone)
  WHERE phone IS NOT NULL;

-- user_contacts: fallback for email-only contacts
CREATE UNIQUE INDEX IF NOT EXISTS user_contacts_owner_id_email_key
  ON public.user_contacts (owner_id, email)
  WHERE email IS NOT NULL;

-- phone_contacts: needed by useSyncContacts
CREATE UNIQUE INDEX IF NOT EXISTS phone_contacts_profile_id_phone_number_key
  ON public.phone_contacts (profile_id, phone_number);
```

Partial indexes (WHERE ... IS NOT NULL) prevent conflicts when phone/email is null while still enabling the upsert.

### 2. Code Adjustment — `src/hooks/useUserContacts.tsx`

The current upsert only uses `onConflict: 'owner_id,phone'`, which fails for email-only contacts (where phone is null). Split the upsert into two batches:
- Contacts with a phone → upsert on `owner_id,phone`
- Contacts with only email (no phone) → upsert on `owner_id,email`

### Files Modified
- Database migration (2 unique indexes on `user_contacts`, 1 on `phone_contacts`)
- `src/hooks/useUserContacts.tsx` — split upsert by phone vs email-only

No UI changes. No changes to squad, auth, or styling files.

