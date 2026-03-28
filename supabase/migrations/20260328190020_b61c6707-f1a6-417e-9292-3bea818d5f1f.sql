
-- Create user_contacts table for cloud-backed contacts
CREATE TABLE public.user_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  phone text,
  email text,
  source text NOT NULL DEFAULT 'csv',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicates per owner
CREATE UNIQUE INDEX user_contacts_unique_phone ON public.user_contacts (owner_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX user_contacts_unique_email ON public.user_contacts (owner_id, email) WHERE email IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own contacts
CREATE POLICY "Users can view own contacts"
  ON public.user_contacts FOR SELECT
  TO authenticated
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own contacts"
  ON public.user_contacts FOR INSERT
  TO authenticated
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own contacts"
  ON public.user_contacts FOR UPDATE
  TO authenticated
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own contacts"
  ON public.user_contacts FOR DELETE
  TO authenticated
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
