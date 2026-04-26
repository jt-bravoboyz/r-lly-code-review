## Security Hardening: Realtime Channels & Profiles Finding

### Background

Two findings were raised. After investigation:

**1. `realtime_missing_channel_authorization` (error)** — Partially valid.
The app uses two distinct Realtime patterns:
- **`postgres_changes` subscriptions** (notifications, event_attendees, rides, chat messages, etc.). Payloads from these are *already* filtered by RLS on the underlying tables (`messages`, `notifications`, `event_attendees`, etc.). A user subscribing to `notifications-realtime` only receives rows they could `SELECT` directly. This part of the finding overstates the risk.
- **Broadcast channels** (currently only `typing_indicator:chat-<id>`). These DO flow through `realtime.messages` and need explicit policies. The existing policy allows authenticated users to write to ANY `typing_indicator:%` topic — including chats they aren't members of — which leaks "user is typing" presence to outsiders.

**2. `profiles_no_friend_visibility` (warn)** — Already correct, no action needed. The finding's own description concludes "No action needed here" because PII columns are owner-restricted and cross-table joins go through `SECURITY DEFINER` functions that scope access correctly.

### Plan

**A. Tighten the `typing_indicator` broadcast policy**
Replace the broad `typing_indicator:%` policy on `realtime.messages` with one that only allows authenticated users to send/receive on `typing_indicator:chat-<chatId>` topics where they are a verified `chat_participants` member (reusing the existing `is_chat_member()` SECURITY DEFINER function).

**B. Add a deny-by-default posture for any future broadcast topics**
The existing `realtime.messages` policies are already deny-by-default (no policy = no access). Postgres-changes traffic does not pass through `realtime.messages`, so no policy work is required there — RLS on the source tables (already in place) is the security boundary.

**C. Resolve both findings in the scanner**
- Mark `realtime_missing_channel_authorization` as fixed with an explanation that postgres_changes payloads are RLS-filtered and the broadcast policy was tightened to chat-membership.
- Mark `profiles_no_friend_visibility` as fixed (per the scanner's own conclusion, no action needed).

### Technical Changes

One SQL migration:

```sql
-- Drop the old overly-permissive typing indicator policies
DROP POLICY IF EXISTS "<existing typing policies>" ON realtime.messages;

-- Allow only chat members to broadcast/receive on their chat's typing topic
CREATE POLICY "Chat members can use typing_indicator broadcast"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'typing_indicator:chat-%'
  AND public.is_chat_member(
    substring(realtime.topic() from 'typing_indicator:chat-(.+)')::uuid
  )
);

CREATE POLICY "Chat members can send typing_indicator broadcast"
ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'typing_indicator:chat-%'
  AND public.is_chat_member(
    substring(realtime.topic() from 'typing_indicator:chat-(.+)')::uuid
  )
);
```

The migration will first inspect existing `realtime.messages` policies (via `pg_policies`) and drop only the prior typing-indicator ones.

### Files Touched

- One new SQL migration under `supabase/migrations/`.
- No app code changes — `ChatView.tsx` already builds the topic as `typing_indicator:chat-${chatId}`.

### What's Out of Scope

- No changes to the `profiles` table or its RLS (finding #2 is already correctly resolved).
- No changes to `postgres_changes` channels — those rely on table-level RLS which is already in place.
- No new soft-delete / chat / invite work (those were completed in prior plans).
