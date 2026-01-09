-- Add notification preferences table for push notification settings
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  bar_hop_transitions BOOLEAN NOT NULL DEFAULT true,
  ride_offers BOOLEAN NOT NULL DEFAULT true,
  ride_requests BOOLEAN NOT NULL DEFAULT true,
  arrival_confirmations BOOLEAN NOT NULL DEFAULT true,
  event_updates BOOLEAN NOT NULL DEFAULT true,
  squad_invites BOOLEAN NOT NULL DEFAULT true,
  going_home_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add squad_invites table for email/SMS invites
CREATE TABLE public.squad_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('email', 'sms')),
  contact_value TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.squad_invites ENABLE ROW LEVEL SECURITY;

-- Squad owners can manage invites
CREATE POLICY "Squad owners can manage invites"
ON public.squad_invites
FOR ALL
USING (squad_id IN (SELECT squads.id FROM squads WHERE squads.owner_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())));

-- Anyone can view invites by code (for accepting)
CREATE POLICY "Anyone can view invites by code"
ON public.squad_invites
FOR SELECT
USING (true);