
-- Drop both overloaded versions
DROP FUNCTION IF EXISTS public.request_join_event(uuid);
DROP FUNCTION IF EXISTS public.request_join_event(uuid, boolean);

-- Create single unified function with default parameter
CREATE OR REPLACE FUNCTION public.request_join_event(p_event_id uuid, p_has_invite_code boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_is_host boolean;
  v_has_invite boolean;
  v_final_status text;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  SELECT status INTO v_existing_status
  FROM event_attendees
  WHERE event_id = p_event_id AND profile_id = v_profile_id;
  
  IF v_existing_status = 'attending' THEN
    RETURN jsonb_build_object('error', 'Already attending', 'status', 'attending');
  ELSIF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('error', 'Request already pending', 'status', 'pending');
  END IF;
  
  v_is_host := EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND creator_id = v_profile_id
  ) OR EXISTS (
    SELECT 1 FROM event_cohosts WHERE event_id = p_event_id AND profile_id = v_profile_id
  );

  v_has_invite := p_has_invite_code OR EXISTS (
    SELECT 1 FROM event_invites
    WHERE event_id = p_event_id
      AND invited_profile_id = v_profile_id
      AND status IN ('pending', 'accepted')
  );
  
  v_final_status := CASE WHEN v_is_host OR v_has_invite THEN 'attending' ELSE 'pending' END;
  
  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, v_final_status)
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'status', v_final_status);
END;
$function$;
