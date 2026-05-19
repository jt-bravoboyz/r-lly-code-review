
-- 1. Standalone context for split_check_requests
ALTER TABLE public.split_check_requests
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.split_check_requests
  DROP CONSTRAINT IF EXISTS split_check_requests_context_check;
ALTER TABLE public.split_check_requests
  ADD CONSTRAINT split_check_requests_context_check
  CHECK (context IN ('event','standalone'));

-- Guarantee event-context rows still have an event_id
ALTER TABLE public.split_check_requests
  DROP CONSTRAINT IF EXISTS split_check_requests_event_required;
ALTER TABLE public.split_check_requests
  ADD CONSTRAINT split_check_requests_event_required
  CHECK (
    (context = 'event' AND event_id IS NOT NULL)
    OR (context = 'standalone')
  );

-- 2. Payments: allow guest payments (no user_id)
ALTER TABLE public.payments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_user_or_guest;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_or_guest
  CHECK (
    user_id IS NOT NULL
    OR (metadata ? 'guest_token_id')
  );

-- 3. Guest pay tokens (service role only)
CREATE TABLE IF NOT EXISTS public.split_guest_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.split_check_requests(id) ON DELETE CASCADE,
  email text,
  phone text,
  display_name text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  token_hash text NOT NULL UNIQUE,
  paid_at timestamptz,
  fluid_pay_transaction_id text,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  claimed_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);
CREATE INDEX IF NOT EXISTS idx_sgt_request ON public.split_guest_tokens(request_id);
ALTER TABLE public.split_guest_tokens ENABLE ROW LEVEL SECURITY;
-- No client policies: edge functions use service role only.

-- 4. RLS: standalone-context branches for split_check_* tables
-- split_check_requests: target read covers standalone via existing targets join (no change needed),
-- host policy already keyed on host_id (works for both contexts).

-- split_check_targets: payer read policy — add standalone-aware branch (target sees own row)
DROP POLICY IF EXISTS "sct target read own" ON public.split_check_targets;
CREATE POLICY "sct target read own"
ON public.split_check_targets
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- split_check_items: targets can read items for any request they're targeted on
DROP POLICY IF EXISTS "sci target read" ON public.split_check_items;
CREATE POLICY "sci target read"
ON public.split_check_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.split_check_targets t
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE t.request_id = split_check_items.request_id
      AND p.user_id = auth.uid()
  )
);

-- payments: host of the standalone split request can read it
DROP POLICY IF EXISTS "payments standalone host read" ON public.payments;
CREATE POLICY "payments standalone host read"
ON public.payments
FOR SELECT
USING (
  split_request_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.split_check_requests r
    JOIN public.profiles p ON p.id = r.host_id
    WHERE r.id = payments.split_request_id
      AND p.user_id = auth.uid()
  )
);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.split_guest_tokens;
