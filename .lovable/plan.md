# Plan — Native Push, Persistent Squad Invites, Inline Squad Accept

## 1. Native push notifications (`src/hooks/usePushNotifications.tsx`)

### A. Hydrate `isSubscribed` from DB on mount (native)
Add a `useEffect` keyed on `profile?.id`. When `isNative()` and `profile?.id` are both truthy, query:
```ts
supabase.from('push_subscriptions')
  .select('endpoint')
  .eq('profile_id', profile.id)
  .like('endpoint', `capacitor:${Capacitor.getPlatform()}:%`)
  .limit(1).maybeSingle()
```
If a row exists, `setIsSubscribed(true)`. This replaces the existing "leave as best-effort" comment so the toggle reflects reality after app relaunch.

### B. 4.5s graceful APNs fallback
Refactor the `tokenPromise` block in `subscribe()`:
- Wrap APNs `registration` / `registrationError` listeners in a promise that resolves with a real token, but races against `setTimeout(4500)`.
- On timeout: do NOT reject. Instead save a sentinel row with endpoint `capacitor:ios:realtime-fallback:{profile.id}`, `p256dh='realtime'`, `auth='realtime'`, then `setIsSubscribed(true)` + `toast.success('Notifications enabled (in-app)')` and `return true`.
- On success: keep the existing token-based path.
- Clear the timeout in both branches to avoid late fires.

### C. Recover from denied iOS permission
When `perm.receive === 'denied'`:
```ts
toast.error('Go to iPhone Settings → R@lly → Notifications and turn on Allow Notifications', { duration: 7000 });
try {
  const { App } = await import('@capacitor/app');
  await App.openUrl({ url: 'app-settings:' });
} catch { /* noop */ }
return false;
```

## 2. APNs delivery in `supabase/functions/send-push-notification/index.ts`

### Routing in the `subscriptions.map` loop
Replace the unconditional `sendWebPush` call with:
```ts
subscriptions.map((sub) => {
  if (sub.endpoint.startsWith('capacitor:') && sub.endpoint.includes('realtime')) {
    return Promise.resolve(true);            // in-app realtime handles it
  }
  if (sub.endpoint.startsWith('capacitor:ios:')) {
    const token = sub.endpoint.slice('capacitor:ios:'.length);
    return sendApnsNotification(token, { title, body, data, tag });
  }
  if (sub.endpoint.startsWith('capacitor:android:')) {
    return Promise.resolve(false);           // FCM not yet wired
  }
  return sendWebPush(sub, ...);
})
```

### New `sendApnsNotification(deviceToken, payload)`
- Read `APNS_PRIVATE_KEY` (PEM p8 contents), `APNS_KEY_ID`, `APNS_TEAM_ID` via `Deno.env.get`. If any are missing, log and return `false` (do not throw — web path still works).
- Build ES256 JWT: header `{ alg:'ES256', kid: APNS_KEY_ID, typ:'JWT' }`, payload `{ iss: APNS_TEAM_ID, iat: now }`. Cache the JWT in module scope for ~50 min to stay under Apple's 60-min cap.
- Import the p8 with `crypto.subtle.importKey('pkcs8', …, ECDSA P-256, ['sign'])`. Reuse the existing `base64UrlEncode` helper.
- `POST https://api.push.apple.com/3/device/{deviceToken}` with headers:
  - `authorization: bearer {jwt}`
  - `apns-topic: com.bravoboyz.rally`
  - `apns-push-type: alert`
  - `apns-priority: 10`
  - `content-type: application/json`
- Body: `{ aps: { alert: { title, body }, sound: 'default', badge: 1 }, data: payload.data ?? {} }`.
- Return `true` on HTTP 200; otherwise log status + response text and return `false`.

### Secrets the user must add (call out after the plan is approved)
`APNS_PRIVATE_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID` (Team `Y2LST9547H`). I will request these via `add_secret` immediately before deploying the edge change so APNs starts working as soon as the keys land. The web path keeps working in the meantime.

## 3. Persistent "Sent" badges in `src/components/squads/SquadInviteDialog.tsx`

- Replace the local-only `invitedUserIds` Set seeding with a real query on dialog open. Use `react-query` (`useQuery` keyed on `['squad-invites', squadId]`) that fires when `open === true && profile?.id`:
  ```ts
  supabase.from('squad_invites')
    .select('contact_value, invite_type, status')
    .eq('squad_id', squadId)
    .eq('invited_by', profile.id)
  ```
- Derive three memoized sets from the query result:
  - `invitedProfileIds`: rows where `invite_type='in_app'` and `contact_value` starts with `profile:` → strip prefix.
  - `invitedEmails` / `invitedPhones`: rows where `invite_type='email'|'sms'` and `contact_value` isn't `link-share`/`native-share`.
- Initialize component state from `invitedProfileIds`. When `handleInviteUser` succeeds, optimistically add to the Set AND `queryClient.invalidateQueries(['squad-invites', squadId])`.
- Keep the existing reset-on-close behavior, but the next open will refetch so state survives.
- In the Email / SMS tabs, when the typed value matches a row in `invitedEmails` / `invitedPhones`, show a small muted line under the input: "Already invited via email" / "Already invited via SMS" and tint the Send button as a secondary `Re-send` (still allowed).

## 4. Inline Accept/Decline on Squad invite alert cards

### New RPC (migration) — `accept_squad_invite(p_squad_id uuid)`
SECURITY DEFINER, search_path = public. Behavior:
1. Resolve caller `profile_id` from `auth.uid()`; error if none.
2. Verify a pending row exists: `squad_invites` where `squad_id = p_squad_id` AND `status = 'pending'` AND `expires_at > now()` AND (`contact_value = 'profile:' || caller_profile_id` OR caller's email/phone matches a sms/email invite). Error `not_invited` otherwise.
3. `INSERT INTO squad_members (squad_id, profile_id, role) VALUES (p_squad_id, caller_profile_id, 'member') ON CONFLICT DO NOTHING`.
4. `UPDATE squad_invites SET status='accepted' WHERE squad_id = p_squad_id AND (contact_value = 'profile:' || caller_profile_id OR id matches the matching row)`.
5. Return `jsonb_build_object('success', true, 'squad_id', p_squad_id)`.

Also add `decline_squad_invite(p_squad_id uuid)` that updates matching pending invites to `status='declined'` for the caller. Keeps RLS intact (no policy widening on `squad_members`).

`GRANT EXECUTE ON FUNCTION public.accept_squad_invite(uuid) TO authenticated;` and same for decline.

### `src/components/notifications/InviteAlertCard.tsx`
- Add `handleSquadResponse(response: 'accepted'|'declined')` that calls `supabase.rpc('accept_squad_invite'|'decline_squad_invite', { p_squad_id: data.squad_id })`.
- On accept: `toast.success("You joined the squad! 🎉")`, then `queryClient.invalidateQueries({ queryKey: ['squads'] })` and `['notifications']`, mark read.
- On decline: `toast.info('Squad invite declined')`, mark read.
- Render block: when `isSquadInvite && !notification.read && data?.squad_id`, show the same Accept/Decline button pair as friend requests (using `handleSquadResponse`). Fall back to the existing "View Invite" button only when no `squad_id` is present (legacy notifications).
- Inject `useQueryClient` + a small `useState` for `isResponding` so buttons disable while the RPC is in flight.

## Verification

- **Native push UI**: Reopen the app on a device that previously enabled push → toggle shows "Enabled". Toggle off → row is removed and shows "Disabled" on next launch.
- **APNs timeout fallback**: With APNs intentionally broken (e.g. dev simulator), tapping Enable shows the in-app success toast within ~5s and creates a `realtime-fallback` row.
- **Permission denied**: Deny iOS prompt → toast + Settings deep link opens.
- **APNs delivery**: After secrets are set, trigger any notification path (friend request, rally start) → device receives a banner.
- **Squad invite badges**: Invite a user, close + reopen the dialog → user still shows `Sent ✓`. Type an already-invited email → muted note appears.
- **Inline squad accept**: Receive a squad invite → Accept directly from `/notifications`, confirm `squad_members` row created and the squad appears in the Squads tab without navigating to `/join-squad`.

## Out of scope
- FCM/Android push delivery (stubbed `false` for now).
- Reworking the standalone `/join-squad` page.
- Migrating existing legacy `event_invite`/`rally_invite` cards to inline accept.