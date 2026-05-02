-- Auto-archive stale After R@llies after 24 hours
-- Flips events stuck in 'after_rally' for >24h to 'completed' so they drop out
-- of Live Now feeds and into the Past R@llies archive.

CREATE OR REPLACE FUNCTION public.auto_archive_stale_after_rallies()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.events
       SET status = 'completed', updated_at = now()
     WHERE status = 'after_rally'
       AND COALESCE(updated_at, start_time) < now() - interval '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Unschedule any prior version then schedule fresh (every 15 minutes)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-archive-after-rally');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'auto-archive-after-rally',
  '*/15 * * * *',
  $$ SELECT public.auto_archive_stale_after_rallies(); $$
);