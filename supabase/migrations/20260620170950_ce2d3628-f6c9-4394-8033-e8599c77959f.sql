CREATE OR REPLACE VIEW public.merchant_accounts_public
WITH (security_invoker = on)
AS
SELECT
  id,
  profile_id,
  status,
  legal_name,
  email,
  country,
  requirements_due,
  payouts_enabled,
  last_synced_at,
  created_at,
  updated_at
FROM public.merchant_accounts;

GRANT SELECT ON public.merchant_accounts_public TO authenticated;