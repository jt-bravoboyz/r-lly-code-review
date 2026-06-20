-- Phase 1: Tabs Realtime hardening

-- 1. Stop broadcasting guest-pay bearer tokens to clients
ALTER PUBLICATION supabase_realtime DROP TABLE public.split_guest_tokens;

-- 2. Helper: is the caller host or active target on this split_check_requests id?
CREATE OR REPLACE FUNCTION public.is_split_request_participant(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.split_check_requests r
    JOIN public.profiles p ON p.id = r.host_id
    WHERE r.id = _request_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.split_check_targets t
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE t.request_id = _request_id
      AND p.user_id = auth.uid()
      AND COALESCE(t.status, '') <> 'canceled'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_split_request_participant(uuid) TO authenticated;

-- 3. Scoped realtime policies for Tabs channels
--    owed-claims-<requestId>
CREATE POLICY "Tabs participants can receive owed-claims broadcast"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'owed-claims-%'
  AND public.is_split_request_participant(
    NULLIF(substring(realtime.topic() FROM 'owed-claims-(.+)'), '')::uuid
  )
);

CREATE POLICY "Tabs participants can send owed-claims broadcast"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'owed-claims-%'
  AND public.is_split_request_participant(
    NULLIF(substring(realtime.topic() FROM 'owed-claims-(.+)'), '')::uuid
  )
);

--    claim-items-<requestId>
CREATE POLICY "Tabs participants can receive claim-items broadcast"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'claim-items-%'
  AND public.is_split_request_participant(
    NULLIF(substring(realtime.topic() FROM 'claim-items-(.+)'), '')::uuid
  )
);

CREATE POLICY "Tabs participants can send claim-items broadcast"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'claim-items-%'
  AND public.is_split_request_participant(
    NULLIF(substring(realtime.topic() FROM 'claim-items-(.+)'), '')::uuid
  )
);