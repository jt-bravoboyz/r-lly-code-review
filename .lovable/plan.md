## What I verified

At the database level, JT (profile `536e4694…`) actually has plenty to show:
- **16 attended events**, including 2 upcoming (Taniya's Tequila Sunset on Jun 3 and Alessandra's Beach Party on Jun 20) and 14 past.
- **7 created events**, mostly in the past.

I confirmed the migrations from the last two turns are applied:
- `profiles` has the restored `Authenticated users can view profiles` SELECT policy.
- `safe_profiles` and `safe_profiles_with_connection` both have `GRANT SELECT TO authenticated`.
- The new `events` SELECT policy correctly includes creators, cohosts, attendees, invitees, and admins — JT qualifies on all his rows.
- `events.creator_id` → `profiles.id` FK exists, so the embedded `creator:profiles!events_creator_id_fkey(...)` join in `useMyEvents` is valid.

So this is **not a fresh data/RLS bug**. JT's rows are reachable. Two likely client-side culprits remain:

1. **`useMyEvents` swallows errors.** The hook does `if (error) throw error` but only on the second branch; the first `.from('event_attendees').select('event_id')` and the `.from('profiles').select('id').single()` calls ignore their `error` field. If either returned a transient error during the bad-RLS window, the hook would have cached `{ current: [], upcoming: [], past: [] }` and there's nothing visible to debug.
2. **Cache key is not scoped to user.** `queryKey: ['my-events-categorized']` doesn't include the auth user id. If JT's React-Query cache (or any persisted cache layer / SW on the native iOS shell) held an empty result from the broken window, it will keep serving `[]` until the bundle is fully reloaded.

## Plan

Pure frontend changes in `src/hooks/useMyEvents.tsx`. No DB, no UI redesign.

1. **Scope the query key to the user**
   - Change `queryKey: ['my-events-categorized']` → `queryKey: ['my-events-categorized', user?.id]`.
   - Pull `user.id` from the hook scope (fetch once via `supabase.auth.getUser()` and use it in both the key and the body) so any stale empty cache from the previous RLS state is invalidated automatically.

2. **Stop silently dropping errors**
   - Check `error` on the `profiles` lookup, the `event_attendees` lookup, and the created-events branch. Throw on real errors instead of returning `{ current: [], upcoming: [], past: [] }`.
   - This makes future regressions surface as a visible loading/error state instead of a silent "no events" empty card — and lets us see them in runtime logs.

3. **Always include created events, not just as a fallback**
   - Today, the hook only queries `creator_id` events if `attendedEventIds` is empty. For JT this isn't the problem (he's attending all his own events too), but the `.or(...)` path is fragile when `attendedEventIds` is very long — switch to a single union query: fetch attended event ids, then fetch events with `.or('creator_id.eq.<id>,id.in.(...)')` only when the list is non-empty, and otherwise fall back to creator-only. Keep the existing categorization logic.

4. **Tell JT to fully reload the app once**
   - After this ships, the new query key forces a refetch. On the iOS native shell, ask JT to fully close + reopen the app (or pull-to-refresh) so the new JS bundle loads. No code workaround can override an old cached bundle that's still running on his device.

## What I am NOT doing

- No DB migrations. The data and policies are correct.
- No changes to `events`, `profiles`, or storage RLS.
- No changes to the Index/PastRallies UI.

## If this doesn't fix it

The next step would be to have JT reproduce in the web preview while signed in as himself, then read `network` + `console` for the actual PostgREST response on `/rest/v1/events?select=*,creator:...,attendees:event_attendees(count)&or=(...)`. That will tell us definitively whether the server is returning `[]` or whether the client is dropping rows.