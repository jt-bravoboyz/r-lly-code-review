
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
        going_home_at = COALESCE(ea.going_home_at, NEW.arrived_at),
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
