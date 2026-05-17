# Fix: Founders blocked from joining cover-charge R@llies

## Root cause
`request_join_event` (SECURITY DEFINER RPC) enforces the cover charge by checking for a `payments` row:

```sql
IF NOT v_is_host THEN
  IF COALESCE(v_cover, 0) > 0 THEN
    SELECT EXISTS (SELECT 1 FROM payments
      WHERE event_id = ... AND user_id = auth.uid()
        AND kind = 'cover' AND status = 'succeeded') INTO v_paid;
    IF NOT v_paid THEN
      RETURN jsonb_build_object('error', 'cover_required', ...);
    END IF;
  END IF;
END IF;
```

The client-side `CoverChargeDialog` short-circuits with a "Founder Fee Waived" screen and calls `onPaid('founder_waived')` — but **no `payments` row is ever inserted**, so the RPC rejects the join with `cover_required`. The user sees the waiver, taps Continue, and the toast says "cover_required".

Founder status is a real server-checkable attribute (`profiles.founder_number IS NOT NULL`), so the waiver should be enforced in the database, not relied on from the client.

## Fix
Single migration that updates `request_join_event` to also exempt founders from the cover gate:

```sql
-- inside the NOT v_is_host branch, before the payment check:
DECLARE v_is_founder boolean;
...
SELECT (founder_number IS NOT NULL)
  INTO v_is_founder
  FROM profiles WHERE id = v_profile_id;

IF COALESCE(v_cover, 0) > 0 AND NOT v_is_founder THEN
  ... existing payment check ...
END IF;
```

Everything else in the function (host exemption, attendee insert, status) is unchanged.

## Why this fix
- **Authoritative**: matches the existing UI promise without trusting the client.
- **Minimal blast radius**: only one branch of one RPC; no schema changes, no client edits, no new tables.
- **Non-founders unaffected**: cover gate still fires for them exactly as today.
- **Already-paid non-founders unaffected**: the `succeeded` payment check still short-circuits for them.

## Out of scope
- No changes to `CoverChargeDialog` UI — it already renders the correct waiver screen for founders, and that flow will now actually succeed.
- No changes to `useCoverChargeGate` — it remains the right client gate for non-founders.
- No retroactive payment-row backfill — founders never needed one.

## Verification
1. Founder account taps Join on a R@lly with `cover_charge > 0` → sees "Founder Fee Waived" → Continue → RPC returns `success: true, status: attending` (or `pending` for non-invitees on private events).
2. Non-founder account on the same R@lly → still gated by `CoverChargeDialog` → must pay → RPC succeeds only after the `payments` row exists.
3. Host/co-host → unchanged, exempt path still wins first.