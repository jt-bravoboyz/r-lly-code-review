ALTER TABLE public.squad_invites DROP CONSTRAINT squad_invites_invite_type_check;
ALTER TABLE public.squad_invites ADD CONSTRAINT squad_invites_invite_type_check 
  CHECK (invite_type = ANY (ARRAY['email', 'sms', 'in_app']));