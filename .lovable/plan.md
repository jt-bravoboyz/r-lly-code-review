## The Problem

"Thursday Night Test" (started 2026-06-18 21:30 UTC, ~20 hours ago) still appears in Live Now and is missing from Past Rallies.

**Root cause:** In `src/hooks/useMyEvents.tsx` (lines 74-84), the "is this live?" check is:

```
isLive = (start <= now && now <= endTime) || status === 'live' || status === 'after_rally'
```

The OR clause means **a stale `status='live'` flag overrides the time window**. If the host never tapped "End Rally" (or End Rally failed), the event's DB status stays `'live'` forever and the rally is pinned to Live Now even though `now > start + 4h`.

I confirmed in the DB: this event has `status='live'`, `end_time=NULL`, so the 4-hour fallback window expired ~16 hours ago — but the stale status keeps it "live".

## The Fix

Make the time window authoritative. If the event's end window has passed, it's past — regardless of stale status.

### Change 1: `src/hooks/useMyEvents.tsx` (the bucket logic)

Replace the isLive/isPast block so that:
- `timeWindowEnded = now > endTime` (using `end_time` or `start + 4h` fallback, same as today)
- `isLive = !timeWindowEnded && ((start <= now && now <= endTime) || status === 'live' || status === 'after_rally')`
- `isPast = timeWindowEnded || status === 'completed' || status === 'cancelled'`

Net effect: any rally whose end window passed drops out of Live Now and into Past Rallies on next refetch, even if the host never formally ended it.

### Change 2: Self-heal the DB row (so other surfaces agree)

When `useMyEvents` detects a row with `status IN ('live','after_rally')` but `timeWindowEnded === true`, fire a best-effort `supabase.from('events').update({ status: 'completed' }).eq('id', event.id)` in the background. Wrapped in try/catch, no await blocking the UI, RLS will silently no-op for non-hosts.

This keeps EventDetail, Past Rallies, recap flow, and any other consumer that reads `events.status` directly in agreement, without needing to touch every consumer.

### Out of scope

- Not changing `useEndRally` — that path is fine when the user actually taps End Rally; the bug is purely about un-ended events.
- Not adding a cron/edge function for server-side auto-completion (could be a follow-up; client-side self-heal covers the symptom now).
- Not touching the "Thursday Night Test" row manually — once the fix ships, the next time you (the host) load the app it will self-heal.

## Files Changed

- `src/hooks/useMyEvents.tsx` — bucket logic + background self-heal update
