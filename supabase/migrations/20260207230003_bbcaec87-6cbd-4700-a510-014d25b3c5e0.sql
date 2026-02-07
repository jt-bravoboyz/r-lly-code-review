CREATE OR REPLACE FUNCTION public.request_join_event(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_existing_status text;
  v_is_host boolean;
  v_final_status text;
BEGIN
  -- Get current user's profile ID directly (bypasses RLS)
  SELECT id INTO v_profile_id 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  -- Check if already an attendee
  SELECT status INTO v_existing_status
  FROM event_attendees
  WHERE event_id = p_event_id AND profile_id = v_profile_id;
  
  IF v_existing_status = 'attending' THEN
    RETURN jsonb_build_object('error', 'Already attending', 'status', 'attending');
  ELSIF v_existing_status = 'pending' THEN
    RETURN jsonb_build_object('error', 'Request already pending', 'status', 'pending');
  END IF;
  
  -- Check if user is the host (creator) or a co-host
  v_is_host := EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND creator_id = v_profile_id
  ) OR EXISTS (
    SELECT 1 FROM event_cohosts WHERE event_id = p_event_id AND profile_id = v_profile_id
  );
  
  -- Hosts/co-hosts get auto-approved, others get pending status
  v_final_status := CASE WHEN v_is_host THEN 'attending' ELSE 'pending' END;
  
  -- Insert with appropriate status
  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, v_final_status)
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'status', v_final_status);
END;
$function$;