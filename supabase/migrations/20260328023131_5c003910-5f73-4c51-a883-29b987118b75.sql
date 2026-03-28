
-- Create system_feedback table
CREATE TABLE public.system_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'bug',
  message TEXT NOT NULL,
  screen_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.system_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON public.system_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON public.system_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
