
# R@lly Tab — Standalone Split Check (Option A)

Ship Split Check as a first-class feature usable outside any R@lly, branded "R@lly Tab".

---

## 1. Database migration

Single migration, additive + nullable:

```sql
-- split_check_requests
ALTER TABLE public.split_check_requests
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN context text NOT NULL DEFAULT 'event'
    CHECK (context IN ('event','standalone')),
  ADD COLUMN title text;  -- standalone tabs need their own label

-- payments (mirror)
ALTER TABLE public.payments
  ALTER COLUMN event_id DROP NOT NULL;

-- Guest pay tokens (for non-users to pay before signing up)
CREATE TABLE public.split_guest_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES split_check_requests(id) ON DELETE CASCADE,
  email text,
  phone text,
  display_name text,
  amount_cents integer NOT NULL,
  token_hash text NOT NULL UNIQUE,         -- sha256 of the signed token
  paid_at timestamptz,
  fluid_pay_transaction_id text,
  claimed_profile_id uuid REFERENCES profiles(id),  -- set after post-pay signup
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);
ALTER TABLE public.split_guest_tokens ENABLE ROW LEVEL SECURITY;
-- No client policies — service role only (edge functions).
```

RLS updates on `split_check_*` (add standalone branches):
- `split_check_requests`: host can RW their own; targets can read rows they're in. Add `context='standalone'` branch identical to event branch but with `host_id`/target check instead of event-membership.
- `split_check_targets`, `split_check_items`, `split_check_notifications`: same pattern.
- `payments`: host read = `split_request_id` host OR existing event-host check; payer read unchanged.

## 2. Edge functions

### New: `create-split-guest-link`
Input: `{ request_id, target_email?, target_phone?, display_name, amount_cents }`. Auth required (host).
- Verifies caller hosts the request.
- Generates random token, stores `sha256(token)` in `split_guest_tokens`.
- Returns `https://rlly.cloud/tab/pay/<request_id>?t=<token>`.

### New: `process-guest-pay`
Public (no JWT). Input: `{ request_id, token, card_payload }`.
- Look up token by hash, verify not expired/paid.
- Charge via Fluid Pay (no amount cap — relies on Fluid Pay merchant auth).
- Insert `payments` row with `user_id=NULL`, `event_id=NULL`, `metadata.guest_token_id`.
- Mark token paid; return `{ ok, transaction_id, amount_cents, host_display_name, request_title }`.

### New: `claim-guest-payment`
Auth required (called right after post-pay signup).
- Input: `{ token }`.
- Finds matching `split_guest_tokens` row by hash, sets `claimed_profile_id` = caller's profile.
- Upserts `split_check_targets` row so the host's ledger merges guest pay into the named payer.

### Edits
- `request-split-check`: accept `event_id: null + context: 'standalone' + title`. Validate host has `merchant_accounts.payouts_enabled`. **No amount cap.**
- `process-fluid-pay`: branch on `context`; when standalone, skip event-host check, fall back to `split_check_requests.host_id`.
- `nudge-split-share`: works as-is (operates on targets).

## 3. New pages & components

### `src/pages/SplitCheckHome.tsx` — route `/tabs`
iOS-style historical ledger.

```text
┌─────────────────────────────────────┐
│  Tabs                          [+]  │  ← header, glass bar, big "Start a tab"
├─────────────────────────────────────┤
│  TABS I'VE HOSTED                   │  ← brand-orange section label
│  ┌─────────────────────────────────┐│
│  │ Sushi night       $124 of $180  ││  ← live settlement bar
│  │ 3 paid · 2 pending     [Open]   ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Brunch — Sunday   Settled ✓     ││
│  │ $96 collected                    ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  TABS I OWE / PAID                  │
│  ┌─────────────────────────────────┐│
│  │ Jamie's Bday     $32   [Pay]    ││  ← amber dot = unpaid
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Beach house      $58   Paid ✓   ││  ← green check
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

- Two sections: "Tabs I've Hosted" (queries `split_check_requests` where `host_id = me`, both contexts) and "Tabs I Owe / Paid" (queries `split_check_targets` where `target_profile_id = me`).
- Sticky search at top, pull-to-refresh, realtime subscription for live amounts.
- Empty states: "No tabs yet — split your first check" with primary CTA.
- Brand: Montserrat, R@lly Orange section labels, glass cards (`backdrop-blur-xl`), 44px touch targets, safe-area padded.

### `src/pages/SplitGuestPay.tsx` — route `/tab/pay/:requestId`
Public, token-gated.

Flow:
1. Validates `?t=` against `split_guest_tokens`.
2. Shows "You owe **$32** to **Jamie** for *Sushi night*" card.
3. Fluid Pay card form. Submit → `process-guest-pay`.
4. **The instant** the 200 returns, the screen is replaced (non-dismissible Drawer with `z-[200]`, blocks back button) with:

```text
┌──────────────────────────────┐
│       ✓ Payment secured       │  ← orange checkmark, haptic
│                              │
│   Save your receipt and lock │
│   in your R@lly username      │
│                              │
│  [ email ............... ]   │
│  [ password ............ ]   │
│  [ R@lly username ...... ]   │
│                              │
│        [ Lock it in ]        │  ← primary, full width
│                              │
│   Receipt was emailed to     │
│   jane@email.com             │
└──────────────────────────────┘
```

- Email pre-filled from the guest token.
- Submit → `supabase.auth.signUp` → on success, `profiles` row created by existing trigger → call `claim-guest-payment` with token → route to `/tabs`.
- No skip button. Only escape is closing the tab (receipt still emailed; profile row already created via signup so retargeting works).
- If they reload mid-gate, the token is already `paid_at NOT NULL` so re-landing the page shows the gate again with the same prefill.

### `src/components/payments/StartTabDialog.tsx`
- Wraps existing `RequestPaymentDialog` in standalone mode (no `eventId`).
- Target picker: friends + recent contacts (reuse `ContactSmartSearch`) + manual phone/email entry (creates a guest token + SMS/email link).
- Mandatory title field for standalone.
- No amount cap, no warning.

### Edits
- `RequestPaymentDialog`: optional `eventId` prop; switches copy & validators when omitted.
- `SplitCheckSettlementPanel`: render `request.title` when `context='standalone'`; nudge button works the same; guest-link rows render with name + "Sent via link" subtitle.
- `useSplitCheck`, `useMyUnpaidSplit`: drop the `event_id` requirement; aggregate both contexts.

## 4. Navigation

### Bottom nav — new "Tabs" tile
- Icon: `Receipt` (lucide), label `Tabs`.
- Position: between existing `Squads` and `Profile` (or per current order — confirm with screenshot if shifts feel wrong).
- Badge: count of unpaid tabs (`useMyUnpaidSplit`).

### Profile drawer
- Add row "R@lly Tabs" with same Receipt icon, links to `/tabs`.
- Sits above "Settings".

## 5. Brand & UX guardrails

- Voice: "R@lly Tab", "Start a tab", "Settle up", "Locked in".
- Colors: R@lly Orange for section labels & primary CTAs; green for settled; amber for pending; red only for declined/refunded.
- Glass cards, 16px radius, soft shadow, no heavy borders.
- All touch targets ≥44px.
- Receipt PDF emailed via existing branded email infra on every successful charge (host + payer).

## 6. Files

**New (7)**
- `supabase/migrations/<ts>_rally_tab_standalone.sql`
- `supabase/functions/create-split-guest-link/index.ts`
- `supabase/functions/process-guest-pay/index.ts`
- `supabase/functions/claim-guest-payment/index.ts`
- `src/pages/SplitCheckHome.tsx`
- `src/pages/SplitGuestPay.tsx`
- `src/components/payments/StartTabDialog.tsx`

**Edited (8)**
- `supabase/functions/request-split-check/index.ts`
- `supabase/functions/process-fluid-pay/index.ts`
- `src/components/events/RequestPaymentDialog.tsx`
- `src/components/events/SplitCheckSettlementPanel.tsx`
- `src/hooks/useSplitCheck.tsx`
- `src/hooks/useMyUnpaidSplit.tsx`
- `src/App.tsx` (routes)
- Bottom nav component + Profile drawer (1 file each, exact paths confirmed during build)

## 7. Out of scope (explicitly)

- No transaction caps anywhere.
- No "amount changed" re-verify on guest pay (token is fixed-amount).
- No CSV export (separate ask).
- No recurring tabs (future).

## 8. Memory updates after ship

- New leaf `mem://features/rally-tab-standalone` describing context flag, guest-token flow, post-pay gate.
- Index update under `## Memories`.

Ready to build on approval.
