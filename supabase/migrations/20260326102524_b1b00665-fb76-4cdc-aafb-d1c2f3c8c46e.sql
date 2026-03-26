-- Phase 6: Admin Layer DB Setup

-- 1. User roles table (following security best practices)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: only admins can view roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Founding member columns on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS founding_member boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS founder_number integer;

-- 3. Event feedback table
CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
ON public.event_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
ON public.event_feedback FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. Feature flags table
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default feature flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('enable_simple_mode_default', true, 'Default to simple mode for event creation'),
  ('enable_recap_share', true, 'Enable recap sharing after rally complete'),
  ('enable_founder_badge', true, 'Show Founding 25 badge on profiles'),
  ('enable_growth_ctas', true, 'Show growth CTAs in rally complete overlay')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for analytics_events (for live feed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;