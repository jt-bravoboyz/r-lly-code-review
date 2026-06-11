
-- Add Apple Cash support: new profile column + extend method enums
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apple_cash_handle text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_settlement_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_settlement_check
  CHECK (preferred_settlement IS NULL OR preferred_settlement = ANY (ARRAY['venmo','cashapp','paypal','apple_cash','card']));

ALTER TABLE public.tab_settlements DROP CONSTRAINT IF EXISTS tab_settlements_method_check;
ALTER TABLE public.tab_settlements ADD CONSTRAINT tab_settlements_method_check
  CHECK (method = ANY (ARRAY['venmo','cashapp','paypal','apple_cash','card','other']));
