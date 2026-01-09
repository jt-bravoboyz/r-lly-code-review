-- Create venues table for indoor positioning
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  floor_count INTEGER DEFAULT 1,
  venue_type TEXT DEFAULT 'bar',
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create beacons table for indoor positioning
CREATE TABLE public.venue_beacons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  beacon_uuid TEXT NOT NULL,
  major INTEGER,
  minor INTEGER,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  floor INTEGER DEFAULT 1,
  tx_power INTEGER DEFAULT -59,
  zone_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(beacon_uuid, major, minor)
);

-- Create table to track user presence at venues
CREATE TABLE public.venue_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  floor INTEGER,
  beacon_id UUID REFERENCES public.venue_beacons(id),
  UNIQUE(profile_id, venue_id, entered_at)
);

-- Create table to track friend arrival notification preferences
CREATE TABLE public.arrival_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_on_friend_arrival BOOLEAN DEFAULT true,
  notify_on_friend_departure BOOLEAN DEFAULT true,
  notify_only_same_event BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrival_notification_settings ENABLE ROW LEVEL SECURITY;

-- Venues policies (public read, creators can manage)
CREATE POLICY "Anyone can view venues" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create venues" ON public.venues FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators can update their venues" ON public.venues FOR UPDATE 
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators can delete their venues" ON public.venues FOR DELETE 
  USING (created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Beacon policies (public read for positioning, venue owners can manage)
CREATE POLICY "Anyone can view active beacons" ON public.venue_beacons FOR SELECT USING (is_active = true);
CREATE POLICY "Venue owners can manage beacons" ON public.venue_beacons FOR ALL
  USING (venue_id IN (SELECT id FROM public.venues WHERE created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Venue presence policies (users can manage their own)
CREATE POLICY "Users can view presence in their events" ON public.venue_presence FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR event_id IN (SELECT event_id FROM public.event_attendees WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can update their own presence" ON public.venue_presence FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their presence" ON public.venue_presence FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Notification settings policies
CREATE POLICY "Users can view own settings" ON public.arrival_notification_settings FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own settings" ON public.arrival_notification_settings FOR ALL
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_venue_beacons_updated_at BEFORE UPDATE ON public.venue_beacons 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_arrival_notification_settings_updated_at BEFORE UPDATE ON public.arrival_notification_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for presence tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_presence;