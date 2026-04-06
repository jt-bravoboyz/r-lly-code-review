
-- Drop the four partial unique indexes that don't work with ON CONFLICT
DROP INDEX IF EXISTS public.user_contacts_unique_phone;
DROP INDEX IF EXISTS public.user_contacts_unique_email;
DROP INDEX IF EXISTS public.user_contacts_owner_id_phone_key;
DROP INDEX IF EXISTS public.user_contacts_owner_id_email_key;

-- Add real table-level UNIQUE constraints
ALTER TABLE public.user_contacts ADD CONSTRAINT user_contacts_owner_phone_unique UNIQUE (owner_id, phone);
ALTER TABLE public.user_contacts ADD CONSTRAINT user_contacts_owner_email_unique UNIQUE (owner_id, email);
