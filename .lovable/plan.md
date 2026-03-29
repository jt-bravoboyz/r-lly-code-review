

# Fix Squad Invite End-to-End: Alerts + Squads Tab

## Root Cause Analysis

I traced the full data flow and found the actual failures:

### Why no alert appears
The database trigger `notify_on_squad_invite` **does exist and works**, but it can only create a notification if it can match the invited contact to an existing profile. Here's what's happening:

- SMS invites use a raw phone number (e.g. `4042427500`)
- The trigger normalizes it and searches `profiles.phone`
- **The invited user's profile phone doesn't match** (e.g. they have `+18438555641` stored, not `4042427500`)
- Result: trigger runs, finds no match, silently does nothing → **zero notification rows of type `squad_invite` exist**

Additionally, the `SquadInviteDialog` (used from Squad Detail) only supports email and SMS — it has **no way to invite existing app users directly**. So even though someone is on the app, you can only invite them via their external contact info.

### Why squad doesn't appear in Squads tab
The squad only appears in a user's Squads tab after they are in `squad_members`. That insertion only happens via `join_squad_by_invite_code` (the Accept action). Since no notification is ever created, the user can never accept, so the squad never appears.

### The Create Squad "in-app" path
The `useCreateSquad` hook does create `in_app` invites with `profile:ID` format, which the trigger can resolve. **But there are zero such records in the database**, meaning either nobody has selected members during squad creation, or there's an untested edge case. The code logic appears correct.

## Plan

### 1. Add "App Users" invite option to SquadInviteDialog
This is the critical missing piece. Right now you can only invite via email/SMS, which breaks the notification pipeline when phone numbers don't match.

**File: `src/components/squads/SquadInviteDialog.tsx`**
- Add a third tab: "In-App" alongside Email and SMS
- Show a searchable list of existing app users (reuse `useAllProfiles` from `useSquads.tsx`)
- When selected, insert a `squad_invite` with `invite_type: 'in_app'` and `contact_value: 'profile:<id>'`
- The existing trigger will handle this case and create the notification

### 2. Harden the trigger's phone/email matching
Make the trigger more resilient for SMS/email invites too.

**Migration: update `notify_on_squad_invite` function**
- For SMS: also check `auth.users.phone` (not just `profiles.phone`)
- For email: also try case-insensitive match against `profiles` table directly (some users might not have auth.users accessible)
- Add a fallback: if `contact_value` contains digits and no phone match, try matching the last 10 digits against auth.users.phone too

### 3. Verify notifications RLS allows trigger inserts
The trigger is `SECURITY DEFINER`, so it bypasses RLS. The existing notifications are being created for other types (e.g. `arrived_safe`), confirming the pipeline works. No RLS change needed.

### 4. No changes needed for Squads tab visibility
`useMemberSquads` already queries squads where the user is in `squad_members`. Once a user accepts an invite via `InviteAlertCard` → `join_squad_by_invite_code`, the squad will appear. The rendering and query logic is correct.

## Files to modify
- `src/components/squads/SquadInviteDialog.tsx` — add in-app user picker tab
- Database migration — update `notify_on_squad_invite` function to improve phone/email matching

## Expected result
- Inviting an existing app user from Squad Detail creates an immediate alert in their Alerts tab
- The user can accept → squad appears in their Squads tab
- SMS/email invites have better matching against stored user data
- No UI redesign — just an additional tab in the existing invite dialog

