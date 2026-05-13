## Plan: Switch Fluid Pay to Live Environment + Zero-Risk Smoke Tests

### Goal
Flip `FLUID_PAY_ENV` from `sandbox` → `live` so all Fluid Pay edge functions point to the production API (`app.fluidpay.com`) with the existing live credentials already in secrets. Then re-run the four zero-risk smoke tests and report results + edge function logs.

### Steps

1. **Update secret**
   - `FLUID_PAY_ENV` → `live` (exact lowercase, no quotes or spaces)
   - Uses the existing live keys: `FLUID_PAY_PUBLIC_KEY`, `FLUID_PAY_PRIVATE_KEY`, `FLUID_PAY_PARTNER_KEY`, `PLATFORM_MASTER_SUB_MERCHANT_ID`

2. **Verify config endpoint**
   - `GET /get-fluid-pay-config`
   - Expected: `env: live`, `publicKey: pub_3Dd7re200XisBy6FirgjrILReG7`, `tokenizerScriptUrl: https://app.fluidpay.com/tokenizer/tokenizer.js`

3. **Smoke test payment processing (no real charge)**
   - `POST /process-fluid-pay` with `payment_token: "invalid_token_smoke_test"`, `kind: "cover"`, `amount_cents: 100`
   - Expected: `402 payment_declined` with a generated `payment_id` row (no money moves — token is intentionally invalid)

4. **Test onboarding start**
   - `POST /fluid-pay-onboarding` `{action: "start"}`
   - Expected: either `200` with onboarding URL/fields, or a meaningful Fluid Pay error (e.g., merchant already exists, or missing required field — both confirm live API connectivity)

5. **Test onboarding refresh**
   - `POST /fluid-pay-onboarding` `{action: "refresh"}`
   - Expected: `not_started` if step 4 didn't create a row; otherwise synced status from Fluid Pay

6. **Tail edge function logs**
   - Pull logs for `get-fluid-pay-config`, `process-fluid-pay`, and `fluid-pay-onboarding` after all calls
   - Report timestamps and any runtime errors

### No real charges
All four tests above are zero-risk:
- Invalid token = guaranteed decline by Fluid Pay, but the end-to-end flow (auth → Zod → DB insert → live API call → error capture → status flip) is fully exercised.
- Onboarding `start`/`refresh` only creates/query a `merchant_accounts` DB row and calls the partner API — no card is involved.

### After this
If all four pass, we'll be ready for a real `$1.00` browser test via `FluidPayCardForm` (user's card, refunded immediately).