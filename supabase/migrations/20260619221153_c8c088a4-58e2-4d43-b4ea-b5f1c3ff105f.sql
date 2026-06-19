GRANT SELECT, INSERT, UPDATE, DELETE ON public.split_check_requests TO authenticated;
GRANT ALL ON public.split_check_requests TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.split_check_targets TO authenticated;
GRANT ALL ON public.split_check_targets TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.tab_settlements TO authenticated;
GRANT ALL ON public.tab_settlements TO service_role;

GRANT SELECT ON public.safe_profiles TO authenticated;
GRANT ALL ON public.safe_profiles TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'split_check_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.split_check_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tab_settlements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tab_settlements;
  END IF;
END $$;