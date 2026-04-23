

# Identity, Auth & Admin Portal Upgrades

A four-part hardening pass across identity setup, R@lly creation, admin visibility, and OAuth handshake reliability.

---

## 1. Identity Gate (First + Last Name)

**`src/components/profile/NameSetupDialog.tsx`** is already split into First/Last name inputs with a disabled "Lock It In" button. Confirm and tighten:
- Reaffirm `canSubmit = firstName.trim() && lastName.trim()`.
- On save, write `display_name = "First Last"` and set `needs_name_setup = false` (already in place).
- Strengthen trigger: open whenever `needs_name_setup === true`, OR `display_name` is blank, `"R@lly Member"`, or matches an email-username fallback (single token equal to email prefix).

**`src/hooks/useTutorial.tsx`** — Walkthrough Guard:
- Existing guard already blocks tutorial when `needs_name_setup === true` or `display_name` is empty/`"R@lly Member"`. Extend the check to also block when `display_name` does not contain a space (i.e., no last name yet). This stops the tutorial from racing the name dialog.

---

## 2. Creation Guard — No Ghost R@llies

A R@lly cannot be created with zero invitees and zero squads selected.

**`src/components/events/QuickRallyDialog.tsx`**
- Already supports multi-squad selection via `selectedSquads`. Add an invitee-count requirement:
  - `const hasAudience = selectedSquads.length > 0 || selectedContactIds.length > 0;` (squad selection alone satisfies it).
  - Disable the submit button when `!hasAudience`.
  - Add helper sub-text below the squad picker: *"Add at least one friend or squad to start the R@lly."*

**`src/components/events/CreateEventDialog.tsx`**
- This dialog currently has no invitee step. Add a lightweight "Invite" section in the Review block that surfaces:
  - Squad multi-select (reuse `useAllMySquads`), and
  - An "Invite contacts" entry point (reuse `AddPeopleSheet` / `ContactSelector`).
- Submit button disabled when neither a squad nor a contact is selected; same helper sub-text.
- After create + auto-join, send invites via `useCreateEventInvites` (squad members) and `usePhoneInvites` (contacts), mirroring Quick R@lly logic.

---

## 3. Admin Portal — User Directory & Headcount

**`src/hooks/useAdminData.tsx`**
- Pull `auth.users` email + last_sign_in via a new SECURITY DEFINER RPC `admin_user_directory()` (admins only) returning: `profile_id, display_name, email, created_at, last_sign_in_at`. This avoids exposing PII through the standard `profiles` query.
- Compute per-profile aggregates already available client-side: `referralCount` (from `referralCounts`), `ralliesJoined` (count of `attendees` where `status='attending'`), `ralliesCreated` (count of `rallyEvents` where `creator_id = profile.id`).
- Compute per-event headcount: `headcountByEvent: Record<eventId, number>` from `attendees`.
- Compute `totalLifetimeAttendees`: `attendees.filter(a => a.status === 'attending').length` (or unique profile_id count for "unique" variant).

**New component: `src/components/admin/UserDirectory.tsx`**
- Sortable table: Avatar · Name · Email · Joined · Last Active · Referrals · R@llies Joined · R@llies Hosted.
- Search by name/email. CSV export reusing `AdminCSVExport` pattern.
- Mounted in `AdminDashboard.tsx` Partner view, above User Intelligence.

**Update `src/components/admin/UserIntelligence.tsx`**
- Add headcount badge per host event in the existing detail panel.

**New analytics card in `AnalyticsCards.tsx`**
- "Total Lifetime Attendees" tile next to existing summary metrics.

**New table column in admin event lists** (within `AdminCSVExport` and any rally list rendering)
- Add `Headcount` column sourced from `headcountByEvent[event.id]`.

---

## 4. Google Auth Final Polish

**`src/pages/Auth.tsx`**
- Google: already uses `redirect_uri: 'https://rlly.cloud'` (line 439). Confirm Apple matches by switching `redirect_uri: window.location.origin` → `'https://rlly.cloud'` for parity (line 465).

**`src/components/AuthRedirectGuard.tsx`** — Handshake fix:
- Current guard only reacts to `useAuth` state. Add an explicit `supabase.auth.onAuthStateChange` listener that fires on `SIGNED_IN`:
  - If the current pathname starts with `/auth`, immediately `navigate('/', { replace: true })`.
  - Coexists with the existing effect (effect handles already-authenticated visits; listener handles the OAuth handshake moment).
- Result: returning OAuth users land on `/` the instant tokens are set, eliminating the "stuck on /auth" loop.

---

## Technical Details

**Database migration required** (Section 3):
```sql
create or replace function public.admin_user_directory()
returns table (
  profile_id uuid, user_id uuid, display_name text, email text,
  created_at timestamptz, last_sign_in_at timestamptz, founding_member boolean
)
language sql security definer set search_path = public, auth
as $$
  select p.id, p.user_id, p.display_name, u.email,
         p.created_at, u.last_sign_in_at, p.founding_member
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.has_role(auth.uid(), 'admin'::app_role);
$$;
revoke all on function public.admin_user_directory() from public;
grant execute on function public.admin_user_directory() to authenticated;
```

**Files touched**
- `src/components/profile/NameSetupDialog.tsx` (gate logic)
- `src/hooks/useTutorial.tsx` (last-name guard)
- `src/components/events/QuickRallyDialog.tsx` (audience guard)
- `src/components/events/CreateEventDialog.tsx` (invite step + audience guard)
- `src/components/AuthRedirectGuard.tsx` (SIGNED_IN listener)
- `src/pages/Auth.tsx` (Apple redirect parity)
- `src/hooks/useAdminData.tsx` (directory + headcount aggregates)
- `src/components/admin/UserDirectory.tsx` (new)
- `src/components/admin/UserIntelligence.tsx` (headcount badges)
- `src/components/admin/AnalyticsCards.tsx` (Lifetime Attendees tile)
- `src/components/admin/AdminCSVExport.tsx` (Headcount column)
- `src/pages/AdminDashboard.tsx` (mount UserDirectory)
- New SQL migration for `admin_user_directory()` RPC.

**Out of scope**: changes to existing notification dedup logic (already shipped) and any modifications to the auto-generated `client.ts` / `types.ts` files.

