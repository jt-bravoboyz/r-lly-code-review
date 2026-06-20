## R@lly Tabs security hardening — staged plan

Three migrations + small code refactors, sequenced so each phase is independently shippable and tested.

---

## Phase 1 — Realtime hardening (most urgent)

### Migration
- `ALTER PUBLICATION supabase_realtime DROP TABLE public.split_guest_tokens;` — guest-pay tokens are bearer secrets; no client should ever watch them.
- Add `realtime.messages` SELECT policies scoped to **the exact channel topics we use** (parsed from `realtime.topic()`):
  - `owed-claims-<requestId>` — caller must be host of the request or a non-canceled `split_check_targets.profile_id` on it.
  - `claim-items-<requestId>` — same rule.
  - `split-targets-<profileId>` — caller's profile_id must equal `<profileId>`.
  - `tabs-<requestId>` (if used anywhere) — same as owed-claims rule.
- Default behavior for any other topic stays "deny" (no policy match → no rows), which closes the broad-channel hole flagged by the scanner.

### Code
None — channel names already match these patterns.

### Verification
After deploying, re-run the security scan; finding `realtime_broad_channel_access` should clear. Manually open a Tab in two browser sessions and confirm Realtime claim updates still flow.

---

## Phase 2 — Payment-handle scoping

### Migration
1. **New RPC** `public.get_payment_handles_for_settlement(_target_profile_id uuid)` returning `display_name, venmo_handle, cashapp_handle, paypal_handle, apple_cash_handle, preferred_settlement`. `SECURITY DEFINER`, `STABLE`. Returns the row only when:
   - caller's profile is the same as `_target_profile_id` (read your own), OR
   - there exists a `split_check_targets` row where one side is caller and the other side is `_target_profile_id` and status ≠ `canceled` (active settlement relationship), OR
   - there exists a `split_check_requests` row where caller is host and target is on the request, or vice versa.
   Otherwise returns no rows.
2. **Drop** policy `"Authenticated users can view profiles"` on `public.profiles`. Keep:
   - `Users can view own profile` (owner read)
   - `Admins can view all profiles` (admin override)
   - Existing INSERT/UPDATE policies.
3. Confirm `safe_profiles` view still works for everyone else (it already does — it queries the table with `security_invoker=off`).

### Code (frontend)
- `src/components/payments/TabPaySheet.tsx` (line 89): replace `from('profiles').select('display_name, venmo_handle, …').eq('id', payeeId)` with `supabase.rpc('get_payment_handles_for_settlement', { _target_profile_id: payeeId })`.
- `src/components/payments/PaySplitShareDialog.tsx` (line 59): same swap.
- `src/pages/SplitCheckHome.tsx` (line 162, the `creator` lookup that powers `hasHandles`): swap for the RPC, called per unique creator id (already de-duped in the loader).
- `src/pages/SplitCheckHome.tsx` line 78 (own-profile read), `SetupHandlesSheet.tsx`, `PaymentMethodSection.tsx`, `useCoverChargeGate.tsx` — these read the caller's **own** profile row, which stays allowed by `Users can view own profile`. No change.
- Audit anything else that joins `profiles` for cross-user reads (e.g. notifications, friends) and confirm it goes through `safe_profiles` (it already does in the audited paths).

### Verification
Sign in as Host, open Tabs → "Owed to You" still shows payer names/avatars (safe_profiles). Sign in as a payer, tap a tab → TabPaySheet still pulls the host's Venmo/CashApp/PayPal/Apple Cash via the RPC. Cross-account test: a third user with no `split_check_targets` link calls the RPC → no rows.

---

## Phase 3 — Merchant ID hiding

### Migration
- `CREATE OR REPLACE VIEW public.merchant_accounts_public AS SELECT id, profile_id, status, fluid_pay_card_last4, fluid_pay_card_brand, email, legal_name, created_at, updated_at FROM public.merchant_accounts;` with `security_invoker=on` so existing owner-only RLS on the table applies.
- `GRANT SELECT ON public.merchant_accounts_public TO authenticated;`
- Tighten the underlying table: drop any policy that exposes `fluid_pay_sub_merchant_id` to the client; keep service-role read for edge functions. (If only one owner-read policy exists, leave the table SELECT-able by owner but rely on the view for client reads.)

### Code
- `src/hooks/useMerchantAccount.tsx`: read from `merchant_accounts_public` instead of `merchant_accounts`. Drop `fluid_pay_sub_merchant_id` from the TS interface (the value is only ever needed inside edge functions, which use service role).

### Verification
Host opens "Set Up Tabs" → onboarding status, card last4, brand still render. Edge functions (`process-fluid-pay`, `claim-guest-payment`, etc.) still read the full row via service role — unaffected.

---

## Sequencing
Ship in order: **Phase 1 → Phase 2 → Phase 3**. Each phase is independently revertible. After all three, re-run the security scanner and mark the three Tabs findings as `mark_as_fixed` with explanations, and update `security-memory` to note: payment handles are RPC-gated, `merchant_accounts.fluid_pay_sub_merchant_id` is service-role only, and `split_guest_tokens` is server-side only.

## Out of scope
- The three non-Tabs findings (chat_participants join, email_send_log audit, invite_history phone column) — separate effort.
- No changes to Fluid Pay edge functions or payment math.
