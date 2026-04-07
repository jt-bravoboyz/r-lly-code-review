
-- 1. Update request_join_event RPC to auto-join invitees
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
  v_is_invited boolean;
  v_final_status text;
BEGIN
  SELECT id INTO v_profile_id 
  FROM profiles 
  WHERE user_id = auth.uid();
  
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
  
  v_is_invited := EXISTS (
    SELECT 1 FROM event_invites 
    WHERE event_id = p_event_id AND invited_profile_id = v_profile_id
  );
  
  v_final_status := CASE 
    WHEN v_is_host THEN 'attending' 
    WHEN v_is_invited THEN 'attending'
    WHEN p_has_invite_code THEN 'attending'
    ELSE 'pending' 
  END;
  
  INSERT INTO event_attendees (event_id, profile_id, status)
  VALUES (p_event_id, v_profile_id, v_final_status)
  ON CONFLICT (event_id, profile_id) DO NOTHING;
  
  -- Auto-accept the invite record if they were invited
  IF v_is_invited THEN
    UPDATE event_invites 
    SET status = 'accepted', responded_at = now()
    WHERE event_id = p_event_id AND invited_profile_id = v_profile_id AND status = 'pending';
  END IF;
  
  RETURN jsonb_build_object('success', true, 'status', v_final_status);
END;
$function$;

-- 2. Create trigger: DD arrival cascades to passengers using DD's exact timestamp
CREATE OR REPLACE FUNCTION public.cascade_dd_arrival_to_passengers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_dd = true 
     AND NEW.arrived_safely = true 
     AND (OLD.arrived_safely IS NULL OR OLD.arrived_safely = false) THEN
    
    UPDATE event_attendees ea
    SET arrived_safely = true,
        arrived_at = NEW.arrived_at,
        dd_dropoff_confirmed_at = NEW.arrived_at,
        dd_dropoff_confirmed_by = NEW.profile_id
    FROM ride_passengers rp
    JOIN rides r ON r.id = rp.ride_id
    WHERE r.event_id = NEW.event_id
      AND r.driver_id = NEW.profile_id
      AND rp.status IN ('accepted', 'confirmed')
      AND ea.event_id = NEW.event_id
      AND ea.profile_id = rp.passenger_id
      AND (ea.arrived_safely IS NULL OR ea.arrived_safely = false)
      AND NOT EXISTS (
        SELECT 1 FROM rogue_alerts ra
        WHERE ra.event_id = NEW.event_id AND ra.profile_id = ea.profile_id
      );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dd_arrival_cascade_passengers
  AFTER UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION cascade_dd_arrival_to_passengers();
