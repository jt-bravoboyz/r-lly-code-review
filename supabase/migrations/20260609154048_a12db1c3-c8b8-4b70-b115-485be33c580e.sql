-- Ensure split_check_requests.event_id is nullable (already nullable, but enforce idempotently)
ALTER TABLE public.split_check_requests ALTER COLUMN event_id DROP NOT NULL;

-- Allow hosts to insert split_check_targets for their own requests (needed for standalone splits)
DROP POLICY IF EXISTS "sct host insert" ON public.split_check_targets;
CREATE POLICY "sct host insert"
  ON public.split_check_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.split_check_requests r
      WHERE r.id = split_check_targets.request_id
        AND r.host_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  );