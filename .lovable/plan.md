## Diagnosis

Confirmed by reading the live DB and the two RPCs that back squad invites:

- `get_squad_invite_preview(code)` and `join_squad_by_invite_code(code)` are both `SECURITY DEFINER` and only return rows where `status = 'pending' AND expires_at > now()`.
- Inside `join_squad_by_invite_code`, **the invite row is updated to `status = 'accepted'` after the first successful join**.
- Looking at `squad_invites` for the active squad (`b78994ed-…`), the four most recent `native-share` invites are all already `status = 'accepted'`. Only `in_app` invites tied to a specific profile are still `pending`.

So when Nick taps a link that someone else (or Nick himself on another device) already accepted, both the preview RPC and the join RPC return nothing → the UI shows **"Invite not found or expired"**. This is a logic bug, not RLS or an expiration bug — the `expires_at` is 7 days out and RLS is bypassed by `SECURITY DEFINER`.

There is also a smaller secondary issue: when `JoinSquad.tsx` calls the join RPC and the user is already a member, it routes to `/squads/{id}`, but if the invite is `accepted` it never reaches that branch because the row is filtered out first.

## Plan

### 1. Make share-style invites multi-use
Update `join_squad_by_invite_code` so the row is **only** marked `accepted` for invite types that are inherently single-recipient (`in_app`, `sms`, `email` to a specific contact). For `native-share` / generic share links we keep `status = 'pending'` so multiple people can join via the same link until `expires_at`.

Logic:
```text
if invite_type in ('in_app','sms','email') and contact_value not in (null,'native-share'):
    set status = 'accepted'
else:
    leave status = 'pending'
```

### 2. Show a friendlier reason instead of "Invite not found or expired"
Update `get_squad_invite_preview` to also return rows where `status = 'accepted'` (still gated by `expires_at > now()`), and add a `reason` column the UI can use:
- `pending` → show join card
- `accepted` and current user is already a member → route straight to `/squads/{id}`
- `accepted` and link is single-use → show "This invite was already used. Ask the host for a new one."
- `expires_at <= now()` → show "This invite has expired."

### 3. Tighten `JoinSquad.tsx`
- Trim/uppercase the code from the URL before sending.
- Handle the new `reason` field with distinct copy and CTAs (Resend request / Open Squad / Maybe Later).
- When the join RPC returns `{error:'Already a member', squad_id}`, navigate to `/squads/{squad_id}` (already done), and also fire this branch when preview returns `accepted` + user is in `squad_members`.

### 4. Backfill recent share links
One-shot SQL inside the migration: for `squad_invites` rows where `contact_value IN ('native-share', null)` and `status = 'accepted'` and `expires_at > now()`, set `status = 'pending'` so currently broken share links start working again.

### 5. Logging
Add `console.warn` lines in `JoinSquad.tsx` around the preview + join calls including the resolved `reason`, so the next failure is debuggable from the user's browser logs.

## Files touched

- New migration: update both RPCs + backfill statement.
- `src/pages/JoinSquad.tsx`: handle new `reason`, normalize code, friendlier error UI.

## Out of scope

- No RLS changes. RLS is not the cause; both RPCs are `SECURITY DEFINER`.
- No changes to thumbnails or storage policies.
