CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);