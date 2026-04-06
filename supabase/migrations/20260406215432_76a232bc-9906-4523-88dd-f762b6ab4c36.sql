CREATE POLICY "Drivers can add passengers to their rides"
ON public.ride_passengers
FOR INSERT
TO authenticated
WITH CHECK (
  ride_id IN (
    SELECT r.id FROM rides r
    WHERE r.driver_id IN (
      SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
    )
  )
);