-- Fix: Events Table Exposed Without Authentication
-- Drop the overly permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;

-- Create a new policy that requires authentication to view events
CREATE POLICY "Authenticated users can view events" 
ON public.events FOR SELECT 
USING (auth.uid() IS NOT NULL);