
# Fluid Pay Integration + Smart Split-Check + Direct Host Payouts (TestFlight Foundation)

Replaces simulated payments with real Fluid Pay tokenization. Adds Quick / Itemized split-checks, OCR re-scan, re-request nudges, refunds, and direct host payouts via Fluid Pay sub-merchants. Cards never touch our DB — only opaque tokens. Charges, refunds, and routing all happen server-side via Edge Functions using the platform private key.

**Secrets policy:** Do NOT prompt for keys during this build. Edge Functions read everything from Supabase Secrets at runtime; until those exist, functions return `503 fluid_pay_not_configured` and the UI falls back to the existing `simulatePayment()` path (gated by `localStorage.rally.simulatePayments=true`).

## 1. Database (one migration)

- `payments` — `event_id`, `user_id`, `amount_cents`, `currency`, `kind` ('cover' | 'split_share' | 'refund'), `split_request_id`, `parent_payment_id` (refunds), `fluid_pay_transaction_id`, `destination_sub_merchant_id`, `platform_fee_cents`, `host_net_cents`, `status` ('pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'), `error_message`, `metadata` jsonb. RLS: payer reads own; event host reads payments tied to their event; writes via service role only.

- `split_check_requests` — `event_id`, `host_id`, `mode` ('quick' | 'itemized'), `total_cents`, `subtotal_cents`, `tax_cents`, `tip_cents`, `per_share_cents`, `note`, `receipt_image_url`, `status` ('open' | 'settled' | 'canceled'). RLS: host CRUD; targets read.

- `split_check_targets` — `request_id`, `profile_id`, `share_cents`, `status` ('pending' | 'paid' | 'declined' | 'refunded'), `payment_id`, `last_nudged_at`. RLS: host reads all; target reads/updates own.

- `split_check_items` — `request_id`, `line_no`, `description`, `quantity`, `unit_price_cents`, `total_price_cents`, `parsed_confidence`, `edited_by_host`. RLS: host CRUD; targets read.

- `split_check_item_claims` — `item_id`, `profile_id`, `quantity_claimed`. Unique `(item_id, profile_id)`. RLS: target manages own; host reads all.

- **`merchant_accounts`** (new) — `profile_id` (unique FK to profiles), `fluid_pay_sub_merchant_id`, `status` ('not_started' | 'pending' | 'active' | 'rejected' | 'disabled'), `legal_name`, `email`, `country`, `requirements_due` jsonb (Fluid Pay's onboarding checklist), `payouts_enabled` boolean, `last_synced_at`, timestamps. RLS: owner reads/updates own; service role writes from Edge Functions; admins read all via `has_role`.

- `profiles`: add `fluid_pay_token`, `fluid_pay_card_brand`, `fluid_pay_card_last4`, `fluid_pay_saved_at` (payer-side vault).

- DB function `compute_itemized_share(p_request_id, p_profile_id)` → `{ subtotal_cents, tax_cents, tip_cents, total_cents }` with proportional tax/tip.

- DB function `host_outstanding_balance(p_profile_id)` → outstanding cents owed to a host across their events (sum of `host_net_cents` on `paid` payments where the host has no active `merchant_accounts` row). Drives the "Setup Payouts to withdraw funds" alert.

- Storage bucket `receipts` (private) with RLS keyed by `{event_id}/` prefix.

## 2. Secrets (scaffold; no prompts)

Edge Functions read from `Deno.env`:
- `FLUID_PAY_PRIVATE_KEY` — platform/master account API key.
- `FLUID_PAY_PUBLIC_KEY` — client tokenizer key, served via `get-fluid-pay-config`.
- `FLUID_PAY_PARTNER_KEY` — used by sub-merchant onboarding (`/onboarding` API).
- `FLUID_PAY_ENV` — 'sandbox' | 'live' (defaults sandbox).
- **`PLATFORM_FEE_PERCENT`** — default `"5"`. Read at request time so you can change R@lly's take-home from the dashboard without redeploying.
- `PLATFORM_MASTER_SUB_MERCHANT_ID` — fallback destination for hosts without a sub-merchant yet (so split-share funds settle to the platform until the host onboards; we still record `host_net_cents` so they can withdraw later via internal payout).

Until these are populated, every charge/refund function returns `503 { error: 'fluid_pay_not_configured' }` and onboarding endpoints return `503 { error: 'merchant_onboarding_not_configured' }`. Lovable AI is enabled separately so `parse-receipt` works without further setup.

## 3. Edge Functions

Registered in `supabase/config.toml`. `verify_jwt = true` everywhere except `get-fluid-pay-config`.

- `get-fluid-pay-config` (verify_jwt=false) — `{ publicKey, env, tokenizerScriptUrl, configured }`.

- `process-fluid-pay` — body `{ payment_token, amount_cents, kind, event_id, split_request_id?, save_token? }`.
  1. Validate with Zod, resolve caller profile.
  2. Look up event host → look up `merchant_accounts` for host. If `status='active'` and `payouts_enabled`, set `destination = host.fluid_pay_sub_merchant_id`; else set `destination = PLATFORM_MASTER_SUB_MERCHANT_ID` and flag the payment as "owed to host" (`destination_sub_merchant_id = master`, but `host_net_cents` still calculated so the Settlement panel surfaces an outstanding balance + onboarding prompt).
  3. Compute `platform_fee_cents = round(amount_cents * PLATFORM_FEE_PERCENT/100)`, `host_net_cents = amount_cents - platform_fee_cents`. Founder cover charges already early-return as waived before this fn is called.
  4. Insert `payments` `pending`. POST Fluid Pay `/transaction/sale` with `merchant_id = destination`, `amount` (decimal dollars), `order_id = payments.id`, plus a split/fee descriptor per Fluid Pay's routing API so the platform fee lands in the master account and the remainder in the host's sub-merchant.
  5. On success → `paid` + `fluid_pay_transaction_id`; mark related `split_check_targets.paid` + link payment; if all targets paid → request `settled`. On failure → `failed`, return 402.

- `process-refund` — body `{ payment_id, amount_cents? }`. Caller must be event host/cohost or admin (`has_role`). Calls Fluid Pay `/transaction/refund` with `transaction_id`. Inserts new `payments` row `kind='refund'`, `parent_payment_id` set, status `paid`. Updates original → `refunded` or `partially_refunded`. For split shares: target → `refunded`. Inserts `notifications` row `type='refund_issued'` to original payer.

- `parse-receipt` — body `{ image_url }`. Lovable AI Gateway `google/gemini-2.5-flash` vision + JSON schema → `{ items, subtotal_cents, tax_cents, tip_cents, total_cents }`. Idempotent — used on initial upload and on Re-scan.

- `nudge-split-share` — body `{ request_id, target_profile_ids[] }`. Caller must be host. For each pending target: bumps `last_nudged_at`; if existing `split_check_request` notification is unread → refreshes `created_at`, increments `data.nudge_count`, rewrites title to "Reminder — Pay your share for {event}"; otherwise inserts new `split_check_nudge` notification. Triggers `send-push-notification` when push is enabled.

- **`fluid-pay-onboarding`** (new, verify_jwt=true) — three actions:
  - `start` → creates a Fluid Pay sub-merchant via Partner key (passes profile email/name/country). Inserts/updates `merchant_accounts` with returned `sub_merchant_id` + `requirements_due`. Returns either an `onboarding_url` (if Fluid Pay hosts the rest of the flow) or the `requirements_due` payload to render inline.
  - `refresh` → re-pulls sub-merchant status + `payouts_enabled` from Fluid Pay, updates row.
  - `submit_field` → patches a single onboarding field server-side (so we never hold KYC PII in our DB).
  All three short-circuit to `503` if `FLUID_PAY_PARTNER_KEY` is missing.

- `fluid-pay-webhook` (verify_jwt=false, signature-verified) — receives sub-merchant status changes (`active`, `rejected`, `requirements_updated`) and payout events; updates `merchant_accounts` and inserts a notification (`type='payouts_enabled'` / `'payouts_action_required'`). Stub the signature check until the webhook secret arrives, but log everything.

## 4. Frontend — payer-side (cards & one-tap)

- `src/hooks/useFluidPay.tsx` — fetch config once, lazy-load tokenizer script, expose `tokenize()` and `chargeWithToken()`. Returns `{ configured: false }` cleanly.
- `src/components/payments/FluidPayCardForm.tsx` — hosted card fields, "Save card for one-tap" checkbox, "Powered by Fluid Pay" badge.
- `src/components/payments/PoweredByFluidPay.tsx` — shared trust badge.
- `src/components/profile/PaymentMethodSection.tsx` — saved card display + Replace / Remove; "Founder Fee Waived" pill when `founder_number` is set.

## 5. Frontend — host-side (payouts onboarding)

- `src/hooks/useMerchantAccount.tsx` — load `merchant_accounts` row for current profile, expose `start()`, `refresh()`, `submitField()` calling `fluid-pay-onboarding`.
- **`src/components/profile/PayoutSettingsSection.tsx`** — mounted in Profile under a "Payouts" header. States:
  - `not_started` → "Set up payouts" CTA → calls `start`.
  - `pending` → "Onboarding in progress" + a list of `requirements_due` (each opens an inline form that submits via `submit_field`) or an "Open Fluid Pay onboarding" button if Fluid Pay returns a hosted URL.
  - `active` → green "Payouts active — funds route directly to your account" + masked legal name; "Refresh status" button.
  - `rejected` / `disabled` → contact-support copy + retry.
  Shows the "Powered by Fluid Pay" badge.
- **Soft onboarding rule:** nothing about hosting, creating events, requesting cover charges, or sending split-checks is gated on `merchant_accounts.status`. The only behavior change is in the Settlement panel (below).

## 6. Cover-charge checkout

Replace `PaymentGateDialog` in `EventDetail.tsx`:
1. On Join with `cover_charge > 0`:
   - Founder → skip payment (toast "Founder fee waived"), proceed to `request_join_event`.
   - Else open `CoverChargeDialog`: saved token → "One-Tap Pay $X.XX" + "Use a different card"; otherwise embedded `FluidPayCardForm`.
2. On `{ ok:true, payment_id }` → `request_join_event` then update attendee with `cover_payment_id`.
3. Test toggle → `simulatePayment()` with a "TEST MODE" chip.

## 7. Smart Split-Check

### 7a. Host: `RequestPaymentDialog.tsx` (tabbed)

**Quick Split tab (default, fully functional)** — total input, attendee multi-select, live preview "Split $200.00 equally between 10 people = $20.00 each" (last share absorbs remainder), "Send Request" → `request-split-check` `mode:'quick'`.

**Itemized tab** — receipt dropzone uploads to `receipts/{event_id}/{draft_id}/{ts}.jpg` → `parse-receipt` → editable item list (description, qty, unit price, confidence dot, low-confidence highlighted) → editable Subtotal/Tax/Tip/Total → attendee multi-select → "Send Itemized Request".

**Re-scan Receipt** button on the receipt thumbnail: opens picker, uploads new photo to a new path under the same draft folder, calls `parse-receipt` again, **replaces** items + totals while **preserving** selected attendees, note, event context, and draft id. Toast "Receipt re-scanned — items updated."

### 7b. Attendee: `PaySplitShareDialog.tsx`

Opened from the notification's "Pay My Share" CTA. **Quick:** fixed `share_cents` + one-tap (or tokenizer fallback). **Itemized:** opens `ClaimItemsView` with steppers ("claim X of Y available"), live total via debounced `compute_itemized_share`, realtime on `split_check_item_claims`. "Pay $T.TT" snapshots `share_cents` to the target row on success.

### 7c. Host: `SplitCheckSettlementPanel.tsx`

Mounted in event detail when a request exists.
- Header: total / collected / outstanding / **your net (after platform fee)**.
- **If `merchant_accounts.status != 'active'` and outstanding/collected > 0:** non-blocking inline alert "Set up payouts to withdraw $X — funds are being held in R@lly until you onboard." with "Set up payouts" → opens `PayoutSettingsSection`.
- Per-attendee row: name, status pill, amount, actions:
  - Pending → **Re-request** → `nudge-split-share` for that profile; row shows "Nudged just now".
  - Paid → **Refund** (host/admin) → `RefundConfirmDialog` → `process-refund`; row flips to Refunded.
- **Itemized only — Unclaimed Items** section: rows where `sum(quantity_claimed) < quantity` with the dollar amount uncovered; host can **Claim for me** or **Re-request all** (calls `nudge-split-share` for every still-pending target).
- Realtime on `split_check_targets` and `split_check_item_claims`.

### 7d. Founder waiver scope
Founder fee waiver applies **only to cover charges**, not split-checks.

## 8. Refunds (in scope)

- `process-refund` Edge Function (above).
- `RefundConfirmDialog.tsx` — original amount, optional partial input, reason, confirm.
- Surface: paid split shares in `SplitCheckSettlementPanel`. Cover-charge refunds are issuable through the same function (admin path); UI surface added later.
- New `refund_issued` notification type rendered in Notifications.

## 9. Notification renderer additions

Handle in `Notifications.tsx`:
- `split_check_request` → "Pay My Share" CTA → `PaySplitShareDialog`.
- `split_check_nudge` → "Reminder — Pay My Share" CTA, same dialog.
- `refund_issued` → informational, deep-links to event.
- `payouts_enabled` / `payouts_action_required` → deep-link to `PayoutSettingsSection`.

## 10. Files

**New (~17):**
- `supabase/functions/get-fluid-pay-config/index.ts`
- `supabase/functions/process-fluid-pay/index.ts`
- `supabase/functions/process-refund/index.ts`
- `supabase/functions/parse-receipt/index.ts`
- `supabase/functions/nudge-split-share/index.ts`
- `supabase/functions/fluid-pay-onboarding/index.ts`
- `supabase/functions/fluid-pay-webhook/index.ts`
- `src/hooks/useFluidPay.tsx`
- `src/hooks/useSplitCheck.tsx`
- `src/hooks/useMerchantAccount.tsx`
- `src/components/payments/FluidPayCardForm.tsx`
- `src/components/payments/PoweredByFluidPay.tsx`
- `src/components/payments/CoverChargeDialog.tsx`
- `src/components/payments/PaySplitShareDialog.tsx`
- `src/components/payments/ClaimItemsView.tsx`
- `src/components/payments/RefundConfirmDialog.tsx`
- `src/components/profile/PaymentMethodSection.tsx`
- `src/components/profile/PayoutSettingsSection.tsx`
- `src/components/events/RequestPaymentDialog.tsx`
- `src/components/events/ReceiptUploader.tsx`
- `src/components/events/SplitCheckSettlementPanel.tsx`
- One DB migration

**Edited:**
- `supabase/config.toml` (register seven functions; `get-fluid-pay-config` and `fluid-pay-webhook` `verify_jwt=false`)
- `src/pages/EventDetail.tsx` (swap PaymentGateDialog → CoverChargeDialog; add Request Payment host action; mount `SplitCheckSettlementPanel`)
- `src/pages/Profile.tsx` (mount `PaymentMethodSection` + `PayoutSettingsSection`)
- `src/pages/Notifications.tsx` (handle four new types)

## 11. Out of scope

- Apple Pay / Google Pay sheets (token-based vault first).
- Multi-currency receipts.
- Cover-charge refund admin UI surface (function exists; UI later).
- Internal manual payouts to non-onboarded hosts (held funds remain in master until they onboard; no in-app withdraw button v1).
