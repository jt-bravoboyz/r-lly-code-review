
CREATE UNIQUE INDEX IF NOT EXISTS user_contacts_owner_id_phone_key
  ON public.user_contacts (owner_id, phone)
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_contacts_owner_id_email_key
  ON public.user_contacts (owner_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS phone_contacts_profile_id_phone_number_key
  ON public.phone_contacts (profile_id, phone_number);
