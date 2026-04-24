# Dual-Identity System: full_name + nickname

Move from a single `display_name` field on profiles to a two-field identity:
- **`full_name`** — Private. Always "First Last". Required at setup. Used for admin + safety surfaces.
- **`nickname`** — Public. Optional. Free-form (no uniqueness). Shown to other users when set.
- **Public display rule:** `nickname ?? full_name`.

`display_name` stays on the table (kept in sync) so legacy reads keep working through the rollout.

---

## 1. Current System Audit (findings)

`display_name` is referenced in **~80 frontend files** and **2 edge functions**, plus DB triggers (`handle_new_user`, `notify_on_event_invite`, `notify_on_friend_request`, `notify_on_squad_invite`, `notify_on_rally_started`, `notify_on_chat_message`, `join_squad_by_invite_code`) and the views `safe_profiles`, `safe_profiles_with_connection`, `public_profiles`, plus RPC `search_public_profiles` and `admin_user_directory`.

Strategy: rather than touch every read site, we introduce `full_name` + `nickname`, **keep `display_name` in the schema as a generated/synced "public name" mirror** (so unchanged components show the right public name automatically), and explicitly update only:
- The setup dialog (data entry).
- Admin + safety surfaces (must show real name, not nickname).
- Profile page (lets users edit nickname).

Everything else continues reading `display_name` and gets the correct public-facing value for free.

---

## 2. Database Update (migration)

Add two columns + backfill + keep `display_name` in sync.

```sql
ALTER TABLE public.profiles
  ADD COLUMN full_name text,
  ADD COLUMN nickname  text;

-- Backfill: existing display_name becomes full_name (best available real name today)
UPDATE public.profiles
SET full_name = display_name
WHERE full_name IS NULL;

-- Trigger: keep display_name = COALESCE(nickname, full_name)
CREATE OR REPLACE FUNCTION public.sync_profile_display_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.display_name := COALESCE(NULLIF(trim(NEW.nickname), ''), NULLIF(trim(NEW.full_name), ''), NEW.display_name);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_profile_display_name
BEFORE INSERT OR UPDATE OF full_name, nickname ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_display_name();
```

Update `handle_new_user` to also populate `full_name` from the same metadata it currently uses for `display_name` (when 2+ name parts are present); leave `nickname` NULL.

Update views to expose both names where useful:
- `safe_profiles`, `public_profiles`, `safe_profiles_with_connection`: add `full_name` and `nickname` columns alongside existing `display_name` (so admin queries can pull `full_name` without reading raw `profiles`).
- `admin_user_directory`: add `full_name` and `nickname` to the return signature.

No data deletion. `display_name` is retained as the auto-synced public mirror.

---

## 3. UI Update — `NameSetupDialog`

`src/components/profile/NameSetupDialog.tsx`:
- Keep First Name + Last Name inputs (required) → saved to `full_name = "First Last"`.
- Add a third optional input: **Nickname** with subtext: *"This is your R@lly handle. If left blank, we'll use your real name."*
- On submit:
  ```ts
  await supabase.from('profiles').update({
    full_name: `${first} ${last}`,
    nickname: nickname.trim() || null,
    needs_name_setup: false,
  }).eq('id', profile.id);
  ```
  (The DB trigger will set `display_name` automatically.)

Profile page (`src/pages/Profile.tsx`): add an editable Nickname field in the existing identity section with the same subtext, plus an editable Full Name field (admin/safety only — labeled "Legal/Real name — used for safety check-ins").

---

## 4. Smart Display Logic

Add a tiny helper:

```ts
// src/lib/identity.ts
export type IdentityProfile = { full_name?: string | null; nickname?: string | null; display_name?: string | null };
export const getPublicName  = (p?: IdentityProfile | null) =>
  (p?.nickname?.trim() || p?.full_name?.trim() || p?.display_name?.trim() || 'R@lly Member');
export const getPrivateName = (p?: IdentityProfile | null) =>
  (p?.full_name?.trim() || p?.display_name?.trim() || 'R@lly Member');
```

**Public surfaces** (Feed, Squads, Alerts, Chat, Notifications, Invite cards, Event attendee chips): no code changes required — they already render `display_name`, which the trigger keeps equal to `nickname ?? full_name`. Verified target files include event/squad/chat/notification/invite components.

**Private/admin/safety surfaces** — must always show `full_name`. Update these to read `full_name` (with `display_name` fallback) via `getPrivateName`:
- `src/components/admin/UserIntelligence.tsx`
- `src/components/admin/FounderPanel.tsx`
- `src/components/admin/SquadAudit.tsx`
- `src/components/admin/FeedbackPanel.tsx`
- `src/hooks/useAdminData.tsx` (select `full_name, nickname`)
- `src/components/home/HostSafetyDashboard.tsx`
- `src/components/home/SafetyTracker.tsx`
- `src/components/home/RallyHomeButton.tsx` / `RidePlanCard.tsx`
- `src/components/rides/*` (DD/ride coordination — drivers need real names)
- `src/components/tracking/AttendeeMap.tsx`, `AttendeeLocationItem.tsx`, `MemberLocationCard.tsx`
- `supabase/functions/notify-car-group-rally-home/index.ts` and `send-arrival-notification/index.ts` (select `full_name`, use it in copy)

`useSafetyStatus`, `useSafetyNotifications`, `useDDManagement`: update their profile selects to include `full_name`.

---

## 5. Privacy Notes

- Nickname is **not unique** — no DB constraint, no @-handle semantics.
- Nickname is the **primary public identity** when set; otherwise full name is shown publicly. (We can revisit hiding last name from public surfaces later if desired — out of scope here.)
- Admin and safety contexts always bypass the nickname.

---

## Files Touched

Database: 1 migration (columns, trigger, view + RPC updates, `handle_new_user` update).

New: `src/lib/identity.ts`.

Edited (frontend, ~14 files):
- `src/components/profile/NameSetupDialog.tsx` (nickname input + new save shape)
- `src/pages/Profile.tsx` (nickname + full_name editors)
- `src/hooks/useAdminData.tsx` (select new fields)
- Admin: `UserIntelligence.tsx`, `FounderPanel.tsx`, `SquadAudit.tsx`, `FeedbackPanel.tsx`
- Safety: `HostSafetyDashboard.tsx`, `SafetyTracker.tsx`, `RallyHomeButton.tsx`, `RidePlanCard.tsx`
- Tracking: `AttendeeMap.tsx`, `AttendeeLocationItem.tsx`, `MemberLocationCard.tsx`
- Rides (DD-facing): `RideCard.tsx`, `IncomingRideRequests.tsx`, `DDRequestBanner.tsx`, `RideRequestManager.tsx`

Edited (edge functions, 2):
- `supabase/functions/notify-car-group-rally-home/index.ts`
- `supabase/functions/send-arrival-notification/index.ts`

All other ~60 files reading `display_name` are left untouched and continue to display the public name correctly via the sync trigger.
