## Fix: "Share with all" doesn't add host's portion to their total

### Why it's broken
RLS on `split_check_item_claims` only lets a user insert/delete rows for their own `profile_id`. When the host taps **Share with all**, the client tries to insert one row per participant — only the host's own row succeeds, all the others fail silently. Realtime then refreshes with the partial state and the host's live summary ends up wrong (and tax/tip prorate against a broken denominator).

### Fix
Add a `SECURITY DEFINER` RPC so the host can atomically share/unshare an item across every participant on their tab.

**Migration** — new function `public.share_split_item(_item_id uuid, _share boolean)`:
- Looks up the request via the item.
- Verifies `auth.uid()` maps to a profile equal to `request.host_id` (else raise).
- Always `DELETE FROM split_check_item_claims WHERE item_id = _item_id`.
- If `_share = true`: insert one row (`quantity_claimed = 1`) for `host_id` plus every `split_check_targets.profile_id` for that request where `status <> 'canceled'`.
- `SET search_path = public`, `GRANT EXECUTE ... TO authenticated`.

**Client** — `src/components/payments/ClaimItemsView.tsx`:
- Replace the current `shareAll` body (which does direct delete + insert) with a single `supabase.rpc('share_split_item', { _item_id, _share: !currentlyShared })` call.
- Keep the optimistic refresh + realtime subscription (already handles UI update for everyone).

After this, host's qty=1 row lands alongside everyone else's, `mySubtotalC` picks up `lineTotal / N`, and prorated tax & tip update accordingly.

### Out of scope
- Non-host claim-on-behalf flows.
- Subset sharing (still flagged for later).