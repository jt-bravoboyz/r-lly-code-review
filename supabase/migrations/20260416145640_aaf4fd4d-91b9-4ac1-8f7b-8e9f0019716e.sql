ALTER TABLE public.profiles ADD COLUMN walkthrough_completed boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET walkthrough_completed = true WHERE created_at < now() - interval '24 hours';