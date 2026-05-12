# Wire Fluid Pay UI into Profile + Event Detail

Mount the payments components built in the previous step and swap the legacy `PaymentGateDialog` for the new `CoverChargeDialog`. No business-logic changes.

## 1. `src/pages/Profile.tsx`

- Add imports:
  - `import { PayoutSettingsSection } from '@/components/profile/PayoutSettingsSection';`
  - `import { PaymentMethodSection } from '@/components/profile/PaymentMethodSection';`
- Replace the existing "Payments Placeholder" Card (lines 602–613) with:
  ```tsx
  <PaymentMethodSection />
  <PayoutSettingsSection />
  ```

Both components self-fetch via `useAuth` / `useMerchantAccount`, so no extra props.

## 2. `src/pages/EventDetail.tsx`

### a) Replace `PaymentGateDialog` with `CoverChargeDialog`
- Remove import line 78; add:
  ```tsx
  import { CoverChargeDialog } from '@/components/payments/CoverChargeDialog';
  import { RequestPaymentDialog } from '@/components/events/RequestPaymentDialog';
  import { SplitCheckSettlementPanel } from '@/components/events/SplitCheckSettlementPanel';
  ```
- Replace the JSX block at lines 1360–1366 with:
  ```tsx
  <CoverChargeDialog
    open={showPaymentGate}
    onOpenChange={setShowPaymentGate}
    eventId={event.id}
    eventTitle={event.title}
    amountCents={Math.round((Number((event as any)?.cover_charge) || 0) * 100)}
    founderWaived={!!profile?.founder_number}
    savedToken={profile?.fluid_pay_token ?? null}
    savedCardLast4={profile?.fluid_pay_card_last4 ?? null}
    savedCardBrand={profile?.fluid_pay_card_brand ?? null}
    onPaid={(paymentId) => {
      // persist cover_payment_id after join completes
      handlePaymentSuccess();
      // best-effort link payment to attendee row (no-op if not yet attending)
      supabase.from('event_attendees')
        .update({ cover_payment_id: paymentId } as any)
        .eq('event_id', event.id)
        .eq('profile_id', profile!.id)
        .then(() => {});
    }}
  />
  ```
- `handlePaymentSuccess` stays as-is (closes gate then runs `handleJoin`). Simulation fallback continues to work because `CoverChargeDialog` already checks `useFluidPay().isSimulated()` and the `get-fluid-pay-config` Edge Function returns `configured: false` if secrets are missing — which keeps the form usable through the simulation path.

### b) Mount Split Check UI for hosts/co-hosts
Add a new state near other dialog state:
```tsx
const [showRequestPayment, setShowRequestPayment] = useState(false);
```

Inside the `canManage`-gated host area (after `<HostSafetyDashboard>` / near line ~894 or wherever other host tools render), add:
```tsx
{canManage && profile && (
  <Card className="card-rally">
    <CardHeader className="pb-2">
      <CardTitle className="text-base flex items-center justify-between">
        <span>Split Check</span>
        <Button size="sm" onClick={() => setShowRequestPayment(true)}>Request Payment</Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <SplitCheckSettlementPanel
        eventId={event.id}
        hostProfileId={event.creator_id}
        onOpenPayoutSetup={() => navigate('/profile')}
      />
    </CardContent>
  </Card>
)}
```

### c) Mount the request dialog
Near the bottom alongside other dialogs:
```tsx
{canManage && profile && (
  <RequestPaymentDialog
    open={showRequestPayment}
    onOpenChange={setShowRequestPayment}
    eventId={event.id}
    attendees={(attendees ?? []).map((a: any) => ({
      id: a.id,
      profile_id: a.profile_id,
      display_name: a.profile?.display_name ?? a.display_name,
    }))}
  />
)}
```
(Use whichever attendee list is already loaded on the page; if a different variable name is used, map accordingly.)

## 3. Simulation fallback verification

- `useFluidPay` returns `configured: false` when the Edge Function 503s on missing secrets; `CoverChargeDialog` skips the card form and `simulatePayment()` is invoked when `localStorage.rally.simulatePayments === 'true'`.
- `RequestPaymentDialog` and `SplitCheckSettlementPanel` already gracefully no-op when the corresponding Edge Functions return `fluid_pay_not_configured`.
- No code change required beyond the wiring above.

## Out of scope
- No DB or Edge Function changes.
- No new props on `useEvents` / attendee hooks (uses what's already loaded).
- Cover charge refund admin UI (function exists, surface added later).

## Files edited
- `src/pages/Profile.tsx`
- `src/pages/EventDetail.tsx`
