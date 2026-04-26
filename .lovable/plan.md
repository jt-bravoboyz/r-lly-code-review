# Combined Security Plan: Storage Hardening + Prior Security Items

## Status of Prior Plan (Already Implemented)

The four-part security plan from the previous session has already been executed:

1. **Realtime lockdown** — `realtime.messages` is now deny-by-default, with an explicit allow-list for `typing_indicator:%` topics.
2. **Invite history soft-delete** — `hidden_at` column added; "Clear History" button (R@lly Orange ghost) with confirmation modal in `src/pages/InviteHistory.tsx`; page filters `hidden_at IS NULL`; safety DELETE policy also in place.
3. **Typing indicator** — Live "is typing…" status in `ChatView.tsx` using nickname (with display_name/full_name fallback) over Supabase Realtime Broadcast.
4. **Analytics preservation** — Verified admin growth stats use `phone_invites`/`event_invites`, unaffected by soft-delete.

No additional work needed for items 1–4.

## New Items to Add (This Turn)

### A. event-images bucket — add UPDATE & DELETE policies

**Why:** The bucket currently allows INSERT (creators/cohosts) and public SELECT, but creators cannot replace or remove outdated event images, and there is no guard against unauthorized overwrites.

**Migration:** Two new `storage.objects` policies mirroring the existing INSERT folder-based check:

```sql
CREATE POLICY "Event creators can update event images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT e.id FROM events e
    JOIN profiles p ON p.id = e.creator_id
    WHERE p.user_id = auth.uid()
    UNION
    SELECT ec.event_id FROM event_cohosts ec
    JOIN profiles p ON p.id = ec.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Event creators can delete event images"
ON storage.objects FOR DELETE TO authenticated
USING ( /* same expression */ );
```

### B. invite_history phone exposure — verified secure, mark resolved

**Verification:**
- All 4 RLS policies (SELECT/INSERT/UPDATE/DELETE) on `invite_history` correctly scope to the inviter via `auth.uid() IN (SELECT user_id FROM profiles WHERE id = inviter_id)`.
- No public schema views reference `invite_history` (confirmed by scanning `information_schema.views`).
- The `invited_phone` column cannot leak to any other user.

**Action:** Mark this `supabase_lov` finding as fixed via the security tool with an explanation.

## Things Worth Adding (Recommendations)

While reviewing, I recommend you also approve these small additions for completeness:

1. **rally-media bucket parity check** — Confirm the same UPDATE/DELETE coverage exists on `rally-media` (event photos/videos uploaded by attendees during the rally). If missing, add owner-scoped UPDATE/DELETE policies so users can remove their own uploads. *(Will check in implementation step; only adds policies if a gap exists.)*

2. **Soft-delete trigger for storage cleanup** *(optional, skip unless you want it)* — When a creator deletes an event-images object via the new DELETE policy, no DB row needs cleanup since URLs are stored on the `events` table directly. No action required, just flagging.

3. **invite_history retention note** *(optional)* — Since soft-delete keeps phone numbers indefinitely, consider a future scheduled job (e.g. 12-month auto-purge of `hidden_at` rows older than 1 year) to limit PII retention. Not in scope for this turn — flagging for your roadmap.

## Files to Change This Turn

- New SQL migration: 2 storage policies on `storage.objects` for `event-images` (and `rally-media` if a gap is found).
- `security--manage_security_finding`: mark both new findings resolved.

## No Frontend Changes

Existing UI already attempts overwrite/delete via the Storage SDK — these policies simply unblock the flow safely.
