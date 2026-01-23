-- Part 1: Add profile columns for last destination and home coordinates
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rally_home_destination text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rally_home_lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rally_home_lng double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_lng double precision;

-- Part 2: Add after rally location coordinates to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS after_rally_location_lat double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS after_rally_location_lng double precision;

-- Part 3: Update rides status constraint for lifecycle
-- First check and drop existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rides_status_check') THEN
    ALTER TABLE rides DROP CONSTRAINT rides_status_check;
  END IF;
END $$;

-- Add new status constraint
ALTER TABLE rides ADD CONSTRAINT rides_status_check 
  CHECK (status IN ('active', 'full', 'paused', 'ended', 'canceled', 'available', 'completed'));

-- Migrate existing data to new statuses (keep old values working for backwards compatibility)
UPDATE rides SET status = 'active' WHERE status = 'available';
UPDATE rides SET status = 'ended' WHERE status = 'completed';

-- Part 4: Create unique partial index for one active ride per driver per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_ride_per_driver_event 
  ON rides (driver_id, event_id) 
  WHERE status IN ('active', 'full', 'paused');

-- Part 5: Create ride_offers table for priority ride offers
CREATE TABLE IF NOT EXISTS ride_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'declined', 'expired')),
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
  UNIQUE(ride_id, to_profile_id)
);

-- Enable RLS on ride_offers
ALTER TABLE ride_offers ENABLE ROW LEVEL SECURITY;

-- RLS policies for ride_offers
CREATE POLICY "Ride drivers can create offers" ON ride_offers FOR INSERT
  WITH CHECK (ride_id IN (
    SELECT id FROM rides WHERE driver_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view offers to them or their own rides" ON ride_offers FOR SELECT
  USING (
    to_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR ride_id IN (SELECT id FROM rides WHERE driver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "Offered users can respond" ON ride_offers FOR UPDATE
  USING (to_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Part 6: Create DD disclaimer acceptances audit table
CREATE TABLE IF NOT EXISTS dd_disclaimer_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  disclaimer_version text NOT NULL DEFAULT '1.0',
  app_version text,
  UNIQUE(profile_id, event_id)
);

-- Enable RLS on dd_disclaimer_acceptances
ALTER TABLE dd_disclaimer_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS policies for dd_disclaimer_acceptances
CREATE POLICY "Users can insert own acceptance" ON dd_disclaimer_acceptances FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own acceptances" ON dd_disclaimer_acceptances FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Enable realtime for ride_offers
ALTER PUBLICATION supabase_realtime ADD TABLE ride_offers;