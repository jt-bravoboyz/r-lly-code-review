-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a policy that only allows users to create notifications for themselves
CREATE POLICY "Users can create own notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (
  profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);