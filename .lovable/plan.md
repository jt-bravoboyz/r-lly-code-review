## Why Mia still can't create an event

The server-side fix is already live:
- `public.create_event(...)` SECURITY DEFINER RPC exists and is correct.
- `useCreateEvent` in `src/hooks/useEvents.tsx` calls the RPC (no direct `events` insert remains anywhere in `src/`).

But the Postgres logs show Mia's latest failure (16:30 UTC, after the migration) was still a direct `POST /rest/v1/events` from the iOS native app. Translation: **her installed app is running the pre-fix JavaScript bundle.** The RPC fix can't help a client that doesn't call it.

So the remaining work is distribution + a small defensive guard.

## Plan

### 1. Ship the fix to users

- **Web (`rallyboyz.lovable.app` / `rlly.cloud`)** — publish the current preview so the new `useCreateEvent` (RPC-based) is what browsers download. Until republished, web users on the published domain are still on the broken bundle.
- **Native iOS** — the Capacitor build embeds the JS bundle. A new TestFlight / App Store build is required for Mia (and other native users) to pick up the RPC call. Until then, native users will keep hitting the RLS 403.

These two steps alone unblock Mia.

### 2. Defensive safety net (small code change)

Even after publishing, an old cached bundle could linger. To make this category of bug self-healing instead of a silent 403:

- **Tighten the `events` INSERT RLS policy** so a direct insert fails with a clear, branded message instead of a generic permission error. Replace the current check with one that always returns false for anon/authenticated direct inserts (the SECURITY DEFINER RPC bypasses RLS, so it's unaffected). Optional — keep the current policy if we'd rather not touch RLS.
- **In `useCreateEvent`'s `onError`**, detect the legacy 403 / RLS message and show a toast like _"Please update R@lly to the latest version to create events"_ instead of a raw error. This makes the failure mode obvious next time.

No schema changes, no new tables, no new functions.

### 3. Verify

- After publish, watch `edge_logs` for `POST /rest/v1/rpc/create_event` from Mia's user agent and confirm 200.
- Confirm a row lands in `events` with `creator_id = 82d4faee-…`.
- Confirm the chat auto-create trigger and attendee auto-join still fire (existing triggers, untouched).

## Out of scope

- The unrelated errors in the logs (`split_check_targets` / `split_check_requests` infinite recursion, `rly_user_activity_badges` 403) are real but separate — flagging them but not fixing here unless you want me to.
