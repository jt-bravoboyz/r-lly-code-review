## Hardening the Join Flow — fix all 4 audit issues

Four fixes spanning one DB migration, one signup hook wire-up, one UX polish, and one optional realtime scoping change. Shippable in a single sweep.

---

### Issue 1 (HIGH) — `request_join_event` privilege bug

**Goal:** Server, not client, decides whether the caller actually holds an invite.

**Migration:** Replace the function signature and re-create with a code-string param. Drop the old `boolean` overload so no caller can hit it.

```sql
DROP FUNCTION IF EXISTS public.request_join_event(uuid, boolean);
DROP FUNCTION IF EXISTS public.request_join_event(uuid);

CREATE OR REPLACE FUNCTION public.request_join_event(
  p_event_id uuid,
  p_invite_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_is_host boolean;
  v_has_invite boolean := false;
  v_code_valid boolean := false;
  v_final_status text;
  v_cover numeric;
  v_paid boolean;
  v_is_founder boolean;
BEGIN
  -- (unchanged) resolve profile, founder flag, existing status, host/cohost,
  -- cover-charge enforcement …

  -- NEW: invite presence is computed from real DB state ONLY
  IF p_invite_code IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM events
      WHERE id = p_event_id
        AND upper(invite_code) = upper(p_invite_code)
        AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now())
    ) INTO v_code_valid;
  END IF;

  v_has_invite := v_code_valid OR EXISTS (
    SELECT 1 FROM event_invites
    WHERE event_id = p_event_id
      AND invited_profile_id = v_profile_id
      AND status IN ('pending', 'accepted')
  );

  v_final_status := CASE WHEN v_is_host OR v_has_invite THEN 'attending' ELSE 'pending' END;

  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, v_final_status)
  ON CONFLICT (event_id, profile_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'status', v_final_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_join_event(uuid, text) TO authenticated;
```

**Client updates** — swap every call from `p_has_invite_code: true` to `p_invite_code: <code>` (or omit when there's no code in scope):

| File | Current | New |
| --- | --- | --- |
| `src/pages/JoinRally.tsx:218` | `{ p_event_id, p_has_invite_code: true }` | `{ p_event_id, p_invite_code: code }` (use the `:code` route param) |
| `src/pages/Auth.tsx:237` | same | `{ p_event_id, p_invite_code: pendingCode }` |
| `src/pages/ReturningAuth.tsx:110` | same | `{ p_event_id, p_invite_code: pendingCode }` |
| `src/hooks/useEvents.tsx:224` | `{ p_event_id }` | `{ p_event_id }` (no code in this flow — stays pending-by-default) |
| `src/hooks/useEventInvites.tsx:202` | accept-invite path | `{ p_event_id, p_invite_code: <event.invite_code from row> }` |

Post-migration, `supabase gen types` will regenerate `types.ts` so the boolean param is gone — TS will catch any caller still using `p_has_invite_code`.

---

### Issue 2 (MEDIUM) — wire `useClaimPhoneInvites` into signup

**Where:** Right after a successful sign-up in `src/pages/Auth.tsx`, the post-signup `useEffect` (around lines 141–290) already runs once `user && profile` are both populated. Add a one-shot claim there:

```ts
// inside the post-signup effect, BEFORE the /join/:code redirect
const phoneToClaim = profile?.phone;
if (phoneToClaim && profile?.id) {
  await claimPhoneInvites.mutateAsync({ phone: phoneToClaim, profileId: profile.id });
}
```

- Import: `import { useClaimPhoneInvites } from '@/hooks/usePhoneInvites';`
- Hook: `const claimPhoneInvites = useClaimPhoneInvites();`
- Guarded by an existing `claimedRef = useRef(false)` to fire only once per session.
- Same wire-up added to `src/pages/ReturningAuth.tsx` (covers the lapsed-user re-onboarding path).

Net effect: tap SMS link → sign up with the phone the invite was sent to → `phone_invites` rows resolve into real `event_invites` → the next `request_join_event` call sees the invite and sets status `attending`.

---

### Issue 3 (LOW) — distinguish transient lookup failure from "not found"

In `src/pages/JoinRally.tsx` `fetchEvent`:

- Introduce a `loadError` state alongside `isExpired`.
- If `rpcError` is non-null AND the code matches `/^[A-Z0-9]{4,8}$/i`, set `loadError = true` instead of falling through to the "Not Found" render.
- Add a third render branch (after the existing expired card, before the 404 card):

```
"Trouble loading invite"
"Check your connection and try again."
[ Retry ]  → calls fetchEvent(code)
```

Keeps the explicit "Expired" and "Not Found" cards untouched.

---

### Issue 4 (LOW) — broaden invite realtime

Recommend **Option B: keep `useEventInvites` per-event AND add a new lightweight `useMyHostingInvitesCount()` hook** used by the global dashboard badge. The new hook:

- Queries `event_invites` joined to `events` where `events.creator_id = currentProfileId` (or cohost match).
- Subscribes to `postgres_changes` on `event_invites` with no event filter, then filters client-side by the cached list of hosted event IDs.
- Invalidates a single `['hosting-invite-count']` query on any change.

Cheap, doesn't disturb the existing per-event subscription, gives hosts realtime counters wherever they are. If realtime fan-out cost is a concern, we can ship just the focused fix and skip #4 — call it out as ship-when-ready.

---

### Order of operations

1. Run the migration for Issue 1 (auto-regens types).
2. Update the 5 client callers to the new `p_invite_code` shape.
3. Wire `useClaimPhoneInvites` into `Auth.tsx` and `ReturningAuth.tsx`.
4. Add `loadError` branch to `JoinRally.tsx`.
5. (Optional) Add `useMyHostingInvitesCount` and hook it into the dashboard badge.

### Files touched

- `supabase/migrations/<new>.sql` (new)
- `src/pages/JoinRally.tsx`
- `src/pages/Auth.tsx`
- `src/pages/ReturningAuth.tsx`
- `src/hooks/useEvents.tsx`
- `src/hooks/useEventInvites.tsx`
- `src/hooks/usePhoneInvites.tsx` (no change — already exports hook)
- (optional) `src/hooks/useMyHostingInvitesCount.tsx` (new) + dashboard badge component

### Risk & QA

- **Migration risk:** dropping the boolean overload while old client code is still cached in browsers will return `function does not exist` for ~1 reload cycle. Acceptable for an integrity fix; ship client + migration together.
- **QA:** (a) Open devtools on a private R@lly you weren't invited to, call `supabase.rpc('request_join_event', { p_event_id, p_invite_code: 'WRONG' })` → expect `status: 'pending'`. (b) Use the real code → `status: 'attending'`. (c) SMS-invite a phone number to a test event, sign up with that phone → confirm `attending` (not `pending`) after redirect. (d) Throttle network in devtools to fail the preview RPC → confirm the new "Trouble loading invite" card appears.

Ship #1–#3 as the core integrity fix; #4 is bundled if you want it, deferred if not.
