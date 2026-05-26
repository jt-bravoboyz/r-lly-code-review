## What's actually broken

The last security pass tightened `profiles` RLS down to "users can only view their own row" and never added Data-API grants on the `safe_profiles` / `safe_profiles_with_connection` views. That single change explains all three symptoms:

1. **Caroline tapping your profile shows nothing** — `PublicProfileSheet` queries `safe_profiles_with_connection`. The view has no `GRANT SELECT` to `authenticated`, and even if it did, the underlying `profiles` SELECT policy now denies all rows except your own. So the query returns null and the sheet renders the empty state.

2. **People in shared events don't appear as friends** — `useRallyFriends` resolves connected profile IDs and then calls `from('safe_profiles').select(...).in('id', ids)`. Same root cause: no grant + restrictive RLS on the base table → returns `[]`, so the friends list is empty.

3. **JT's past/upcoming R@llies missing** — `useMyEvents` joins `creator:profiles!events_creator_id_fkey(...)`. With other users' profile rows now denied, the embedded resource silently nulls out, and (combined with the new tightened `events` SELECT policy) any row JT lost attendee/creator linkage to disappears. We will verify against JT's actual rows after the fix; the policy/grant repair below is the prerequisite.

## Plan

### 1. Restore safe public-profile reads
New migration:

- Add an RLS policy on `public.profiles` so any signed-in user can read rows (row-level open, column-level protected by the views):

  ```sql
  CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
  ```

  PII columns (`email`, `phone`, etc.) stay hidden because the app only reads through `safe_profiles*` views, which exclude them.

- Grant Data-API access to both views:

  ```sql
  GRANT SELECT ON public.safe_profiles TO authenticated, anon;
  GRANT SELECT ON public.safe_profiles_with_connection TO authenticated;
  ```

  (`safe_profiles` keeps `anon` so unauthenticated invite previews keep working; the "with_connection" variant stays auth-only.)

### 2. Audit direct `profiles` reads
After the policy change, raw `profiles` is still column-readable. Sweep the client for any place we still select sensitive columns directly (`email`, `phone`, `referred_by` lookups) from other users and either move them through `safe_profiles` or a SECURITY DEFINER RPC. Initial targets: `useRallyFriends`, `useMyEvents` (the embedded `creator:profiles!…` resource — switch to selecting only `id, display_name, avatar_url` which is already safe).

### 3. Verify JT specifically
Once the above lands, re-query JT's `event_attendees` and `events.creator_id` rows to confirm he now sees past/upcoming. If any are still missing, the second-order cause is the new `events` SELECT policy combined with stale attendee linkage — we will repair the linkage rather than re-loosen the policy.

### 4. Update `@security-memory`
Record the invariant: "Profile rows are row-level readable to any authenticated user; PII is hidden by querying `safe_profiles*` views only — never select PII columns from raw `profiles` for other users."

## Out of scope
- No changes to the recently-tightened `events`, `receipts`, `chat-images`, or `split_guest_tokens` policies unless step 3 proves we need them.
- No UI changes.
