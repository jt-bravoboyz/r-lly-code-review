-- =============================================================
-- Security Enhancement: Profile Access Audit Logging & Connection-Based RLS
-- =============================================================

-- 1. Create connection type enum for tracking how users are connected
CREATE TYPE public.connection_type AS ENUM ('event', 'squad', 'self', 'none');

-- 2. Create audit log table for tracking sensitive profile data access
CREATE TABLE public.profile_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_user_id uuid NOT NULL,
  accessor_profile_id uuid,
  accessed_profile_id uuid NOT NULL,
  connection_type connection_type NOT NULL,
  access_context text, -- e.g., 'event:uuid' or 'squad:uuid'
  accessed_fields text[], -- which fields were accessed
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

-- Only system (service role) can insert audit logs, users can view their own access history
CREATE POLICY "System can insert audit logs"
ON public.profile_access_logs
FOR INSERT
TO authenticated
WITH CHECK (accessor_user_id = auth.uid());

CREATE POLICY "Users can view their own access logs"
ON public.profile_access_logs
FOR SELECT
TO authenticated
USING (accessor_user_id = auth.uid());

-- Add index for efficient querying
CREATE INDEX idx_profile_access_logs_accessor ON public.profile_access_logs(accessor_user_id, created_at DESC);
CREATE INDEX idx_profile_access_logs_accessed ON public.profile_access_logs(accessed_profile_id, created_at DESC);

-- 3. Create helper function to check connection via events only
CREATE OR REPLACE FUNCTION public.is_connected_via_event(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN target_profile_id IS NULL THEN false
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM event_attendees ea1
      JOIN event_attendees ea2 ON ea1.event_id = ea2.event_id
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE ea1.profile_id = target_profile_id
      AND ea2.profile_id = p.id
      AND ea1.profile_id != ea2.profile_id
    )
  END
$$;

-- 4. Create helper function to check connection via squads only
CREATE OR REPLACE FUNCTION public.is_connected_via_squad(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN target_profile_id IS NULL THEN false
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM squad_members sm1
      JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE sm1.profile_id = target_profile_id
      AND sm2.profile_id = p.id
      AND sm1.profile_id != sm2.profile_id
    )
    OR EXISTS (
      SELECT 1
      FROM squads s
      JOIN squad_members sm ON s.id = sm.squad_id
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE sm.profile_id = target_profile_id
      AND s.owner_id = p.id
    )
    OR EXISTS (
      SELECT 1
      FROM squads s
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE s.owner_id = target_profile_id
      AND EXISTS (
        SELECT 1 FROM squad_members sm2 
        WHERE sm2.squad_id = s.id AND sm2.profile_id = p.id
      )
    )
  END
$$;

-- 5. Create function to get connection type between users
CREATE OR REPLACE FUNCTION public.get_connection_type(target_profile_id uuid)
RETURNS connection_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN target_profile_id IS NULL THEN 'none'::connection_type
    WHEN auth.uid() IS NULL THEN 'none'::connection_type
    WHEN EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = target_profile_id AND p.user_id = auth.uid()
    ) THEN 'self'::connection_type
    WHEN public.is_connected_via_event(target_profile_id) THEN 'event'::connection_type
    WHEN public.is_connected_via_squad(target_profile_id) THEN 'squad'::connection_type
    ELSE 'none'::connection_type
  END
$$;

-- 6. Create function to log profile access (called by application code)
CREATE OR REPLACE FUNCTION public.log_profile_access(
  p_accessed_profile_id uuid,
  p_accessed_fields text[] DEFAULT ARRAY['display_name', 'avatar_url']
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accessor_profile_id uuid;
  v_connection_type connection_type;
  v_context text;
BEGIN
  -- Get accessor's profile ID
  SELECT id INTO v_accessor_profile_id FROM profiles WHERE user_id = auth.uid();
  
  IF v_accessor_profile_id IS NULL THEN
    RETURN; -- No authenticated user
  END IF;
  
  -- Get connection type
  v_connection_type := get_connection_type(p_accessed_profile_id);
  
  -- Build context based on connection type
  IF v_connection_type = 'event' THEN
    SELECT 'event:' || ea1.event_id::text INTO v_context
    FROM event_attendees ea1
    JOIN event_attendees ea2 ON ea1.event_id = ea2.event_id
    WHERE ea1.profile_id = p_accessed_profile_id
    AND ea2.profile_id = v_accessor_profile_id
    LIMIT 1;
  ELSIF v_connection_type = 'squad' THEN
    SELECT 'squad:' || sm1.squad_id::text INTO v_context
    FROM squad_members sm1
    JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
    WHERE sm1.profile_id = p_accessed_profile_id
    AND sm2.profile_id = v_accessor_profile_id
    LIMIT 1;
  ELSIF v_connection_type = 'self' THEN
    v_context := 'self';
  ELSE
    v_context := 'none';
  END IF;
  
  -- Insert audit log
  INSERT INTO profile_access_logs (
    accessor_user_id,
    accessor_profile_id,
    accessed_profile_id,
    connection_type,
    access_context,
    accessed_fields
  ) VALUES (
    auth.uid(),
    v_accessor_profile_id,
    p_accessed_profile_id,
    v_connection_type,
    v_context,
    p_accessed_fields
  );
END;
$$;

-- 7. Create a more restrictive safe view that tracks connection type
CREATE OR REPLACE VIEW public.safe_profiles_with_connection AS
SELECT 
  sp.id,
  sp.user_id,
  sp.display_name,
  sp.avatar_url,
  sp.bio,
  sp.badges,
  sp.reward_points,
  sp.created_at,
  public.get_connection_type(sp.id) as connection_type
FROM public.profiles sp
WHERE public.is_connected_to_profile(sp.id);

-- Grant access to the view
GRANT SELECT ON public.safe_profiles_with_connection TO authenticated;

-- 8. Create function to get profile access summary for security monitoring
CREATE OR REPLACE FUNCTION public.get_profile_access_summary(
  p_profile_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  total_accesses bigint,
  unique_accessors bigint,
  access_by_type jsonb,
  recent_accessors jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to view their own access summary
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND user_id = auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_accesses,
    COUNT(DISTINCT accessor_user_id)::bigint as unique_accessors,
    jsonb_object_agg(
      COALESCE(pal.connection_type::text, 'unknown'),
      type_count
    ) as access_by_type,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'accessor_profile_id', sub.accessor_profile_id,
        'display_name', p.display_name,
        'last_access', sub.last_access,
        'access_count', sub.access_count
      ))
      FROM (
        SELECT 
          pal2.accessor_profile_id,
          MAX(pal2.created_at) as last_access,
          COUNT(*) as access_count
        FROM profile_access_logs pal2
        WHERE pal2.accessed_profile_id = p_profile_id
        AND pal2.created_at > now() - (p_days || ' days')::interval
        GROUP BY pal2.accessor_profile_id
        ORDER BY last_access DESC
        LIMIT 10
      ) sub
      LEFT JOIN profiles p ON p.id = sub.accessor_profile_id
    ) as recent_accessors
  FROM profile_access_logs pal
  LEFT JOIN LATERAL (
    SELECT pal.connection_type, COUNT(*) as type_count
    FROM profile_access_logs pal2
    WHERE pal2.accessed_profile_id = p_profile_id
    AND pal2.created_at > now() - (p_days || ' days')::interval
    GROUP BY pal2.connection_type
  ) type_counts ON true
  WHERE pal.accessed_profile_id = p_profile_id
  AND pal.created_at > now() - (p_days || ' days')::interval
  LIMIT 1;
END;
$$;

-- 9. Add cleanup function for old audit logs (call periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_logs(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM profile_access_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;