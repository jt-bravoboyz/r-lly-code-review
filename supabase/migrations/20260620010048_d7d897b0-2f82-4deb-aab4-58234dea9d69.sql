CREATE OR REPLACE FUNCTION public.can_read_split_check_request(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.split_check_requests r
    WHERE r.id = _request_id
      AND (
        r.host_id = public.current_profile_id()
        OR EXISTS (
          SELECT 1
          FROM public.split_check_targets t
          WHERE t.request_id = r.id
            AND t.profile_id = public.current_profile_id()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_split_check_target(_target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.split_check_targets t
    JOIN public.split_check_requests r ON r.id = t.request_id
    WHERE t.id = _target_id
      AND (
        t.profile_id = public.current_profile_id()
        OR r.host_id = public.current_profile_id()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_insert_split_check_target(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.split_check_requests r
    WHERE r.id = _request_id
      AND r.host_id = public.current_profile_id()
  );
$$;

DROP POLICY IF EXISTS "scr host all" ON public.split_check_requests;
DROP POLICY IF EXISTS "scr target read" ON public.split_check_requests;

CREATE POLICY "scr host all"
  ON public.split_check_requests
  FOR ALL
  TO authenticated
  USING (host_id = public.current_profile_id())
  WITH CHECK (host_id = public.current_profile_id());

CREATE POLICY "scr host or target read"
  ON public.split_check_requests
  FOR SELECT
  TO authenticated
  USING (public.can_read_split_check_request(id));

DROP POLICY IF EXISTS "sct host insert" ON public.split_check_targets;
DROP POLICY IF EXISTS "sct host read" ON public.split_check_targets;
DROP POLICY IF EXISTS "sct self read" ON public.split_check_targets;
DROP POLICY IF EXISTS "sct target read own" ON public.split_check_targets;
DROP POLICY IF EXISTS "sct self update" ON public.split_check_targets;

CREATE POLICY "sct host insert"
  ON public.split_check_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_insert_split_check_target(request_id));

CREATE POLICY "sct host or self read"
  ON public.split_check_targets
  FOR SELECT
  TO authenticated
  USING (public.can_read_split_check_target(id));

CREATE POLICY "sct self update"
  ON public.split_check_targets
  FOR UPDATE
  TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());