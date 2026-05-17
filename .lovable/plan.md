## Diagnosis

- Both `request-split-check` and `process-fluid-pay` exist on disk, are registered in `supabase/config.toml`, and have zero logs — meaning either they've never been hit or they aren't deployed in this preview's edge runtime.
- All required secrets ARE present (`FLUID_PAY_PRIVATE_KEY`, `FLUID_PAY_PUBLIC_KEY`, `FLUID_PAY_PARTNER_KEY`, `FLUID_PAY_ENV`, `PLATFORM_FEE_PERCENT`, `PLATFORM_MASTER_SUB_MERCHANT_ID`).
- The literal `{"ok":false,"error":"404 not found"}` body shape matches `process-fluid-pay`'s failure response when Fluid Pay's REST API itself returns 404. That means the function IS running, but the upstream `/transaction/sale` call hits a 404 — most likely because `FluidPayCardForm` mints a **synthetic** `tok_sandbox_${ts}_${last4}` token instead of a real Fluid Pay tokenizer token, and Fluid Pay sandbox rejects it.
- Idempotency key + busy lock from the previous turn are already wired in `PaySplitShareDialog`. `FluidPayCardForm` has its own local `busy` lock on its submit button.

## Plan

### 1. Force-deploy both functions and re-verify routing
Deploy `request-split-check` and `process-fluid-pay` immediately so the edge runtime registers the latest versions. Then call each with a minimal probe via `curl_edge_functions` to confirm the endpoints respond (auth 401 is the expected healthy response when called without a valid JWT; a 404 means routing is genuinely broken and we'll escalate).

### 2. Fix the real 404 root cause: real tokenization
`FluidPayCardForm.handleSubmit` currently fabricates a token:
```ts
const token = `tok_sandbox_${Date.now()}_${last4}`;
```
Fluid Pay sandbox rejects this with 404 because no such token exists in their vault. Replace with a real tokenization call using the already-loaded `window.FluidPayTokenizer` script (the hook `useFluidPay.loadTokenizer()` exists for this exact purpose):

```ts
const ok = await loadTokenizer();
if (!ok || !window.FluidPayTokenizer) throw new Error('Tokenizer unavailable');
const tok = await window.FluidPayTokenizer.create({
  publicKey: config.publicKey,
  card: { number: cleaned, exp_month, exp_year, cvv },
});
await onTokenize(tok.id, brand, last4, save);
```

When `config.configured === false` (no keys), fall back to the synthetic token AND mark the call as simulated so `process-fluid-pay` skips the upstream sale. Implementation: client sends `simulate: true`; server returns a synthetic success payment row without calling Fluid Pay.

### 3. Production pay-guard hardening across all branches
- `PaySplitShareDialog` saved-card branch is already guarded by `busy || amountCents === 0 || target?.status === 'paid'`. Good.
- `FluidPayCardForm` has its own local `busy` (`disabled={busy || !allValid}`), but its `busy` doesn't know about the parent's already-paid state. Add an `externalDisabled?: boolean` prop and have `PaySplitShareDialog` pass `target?.status === 'paid' || amountCents === 0`. The submit button then becomes `disabled={busy || !allValid || externalDisabled}`.
- Also guard the form-level `handleSubmit` with `if (busy || externalDisabled) return;` so an Enter-key submit can't bypass.

### 4. Idempotency key — already wired, verify and reinforce
- Client (`PaySplitShareDialog.pay`) already generates `${target.id}:${Date.now()}:${nonce}` and sends it. Confirmed in code.
- Server (`process-fluid-pay`) already (a) returns the prior payment if the same `idempotency_key` is found, (b) returns the existing paid `split_check_target` row if that payer already settled this request, (c) handles the 23505 race via the partial unique index added last turn.
- Add one extra safety: in `process-fluid-pay`, refuse the request if `idempotency_key` is missing AND `kind === 'split_share'` (i.e. require idempotency for split shares in production). Cover charges remain optional.

### 5. Surface upstream failures cleanly
Tweak `process-fluid-pay`'s 402 branch so when Fluid Pay returns `404 not found`, the response message is `"payment_unavailable"` instead of the raw upstream string — easier for the UI toast and avoids leaking internal error text.

## Files to touch

- `supabase/functions/process-fluid-pay/index.ts` — add `simulate` short-circuit, mandatory `idempotency_key` for split_share, cleaner upstream error mapping.
- `src/components/payments/FluidPayCardForm.tsx` — real tokenization via `window.FluidPayTokenizer`, `externalDisabled` prop, submit guard.
- `src/components/payments/PaySplitShareDialog.tsx` — pass `externalDisabled` into the card form.
- `src/components/payments/CoverChargeDialog.tsx` — same `externalDisabled` wire-through (busy locking parity).
- Deploy both functions via `supabase--deploy_edge_functions`.

## Out of scope
- Provisioning a real Fluid Pay sub-merchant / KYC. If `PLATFORM_MASTER_SUB_MERCHANT_ID` is itself the wrong value in the Fluid Pay dashboard, only the user can fix that — I'll flag it in chat if the post-deploy probe still 404s with a real tokenized card.

## Validation
1. Probe deployed functions with `curl_edge_functions` — expect 401 (unauth) not 404.
2. In the preview, attempt a real card pay; the upstream call now uses a real Fluid Pay token. If it still 404s, the diagnostic message will name the missing piece (likely sub-merchant id).
3. Double-tap the pay button under load → only one row updates, idempotency key returns `deduped: true` on the second invocation.
