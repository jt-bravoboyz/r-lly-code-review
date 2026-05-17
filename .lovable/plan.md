## Goal
Eliminate the three double-charge risk paths in the Smart Split-Check pay flow.

## Changes

### 1. `src/components/payments/PaySplitShareDialog.tsx`
Rewrite `pay()` so all guards run before any branch:

```ts
const pay = async (token, brand, last4, save) => {
  if (busy) return;                                  // re-entry guard
  if (target?.status === 'paid') {                   // already-paid guard
    toast.info('Already paid');
    onOpenChange(false);
    return;
  }
  setBusy(true);                                     // immediate UI freeze
  const idempotencyKey = `${target?.id ?? requestId}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;

  try {
    if (isSimulated()) {
      const r = await simulatePayment(amountCents / 100, false);
      if (r.status === 'paid') {
        await supabase.from('split_check_targets')
          .update({ status: 'paid', share_cents: amountCents })
          .eq('id', target.id)
          .neq('status', 'paid');                    // DB-level dedupe
        toast.success('Paid (simulated)');
        onPaid?.(); onOpenChange(false);
      } else toast.error('Failed');
      return;
    }

    if (request.mode === 'itemized') {
      await supabase.from('split_check_targets')
        .update({ share_cents: amountCents }).eq('id', target.id);
    }
    const { data, error } = await supabase.functions.invoke('process-fluid-pay', {
      body: {
        payment_token: token, amount_cents: amountCents, kind: 'split_share',
        event_id: request.event_id, split_request_id: requestId,
        save_token: save, card_brand: brand, card_last4: last4,
        idempotency_key: idempotencyKey,
      },
    });
    if (error || !data?.ok) { toast.error((data as any)?.error ?? 'Payment failed'); return; }
    onPaid?.(); onOpenChange(false);
  } finally {
    setBusy(false);
  }
};
```

Also disable the One-Tap Pay button when `target?.status === 'paid'` for belt-and-braces.

### 2. `supabase/functions/process-fluid-pay/index.ts`
Accept and enforce the idempotency key server-side so a duplicate from any source is rejected, not just the local UI:

- Add `idempotency_key: z.string().min(8).max(128).optional()` to `BodySchema`.
- Before inserting the pending payment, if `idempotency_key` is present, look it up:
  ```ts
  if (body.idempotency_key) {
    const { data: existing } = await admin.from('payments')
      .select('id, status, fluid_pay_transaction_id')
      .eq('idempotency_key', body.idempotency_key)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({
        ok: existing.status === 'paid',
        payment_id: existing.id,
        transaction_id: existing.fluid_pay_transaction_id,
        deduped: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
  ```
- Include `idempotency_key: body.idempotency_key ?? null` in the `payments` insert.
- For split shares, also short-circuit if `split_check_targets` row for `(split_request_id, payer profile)` is already `status='paid'` — return that payment's id without re-charging Fluid Pay.

### 3. Database migration
Add the column + unique index that backs server dedupe:

```sql
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx
  ON public.payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

The partial unique index lets legacy rows (null keys) coexist while guaranteeing future duplicates are blocked at the DB level, which closes the race window between the lookup and the insert.

## Out of scope
- Apply the same hardening to `CoverChargeDialog.tsx`. Not requested in this round, but the pattern is identical — flag if you want it next.
- No UI redesign; button labels and copy unchanged.

## Validation
- Manual: open a split share, double-tap One-Tap Pay rapidly in simulator mode → only one `paid` toast, single row update.
- Reopen the dialog after success → button shows "Already paid" toast and closes without firing.
- Edge function logs: a replayed request with the same `idempotency_key` returns `deduped: true` and does NOT hit Fluid Pay.
