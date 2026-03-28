-- Re-add connected users policy - needed for app functionality.
-- PII is protected at the view/function layer:
-- - safe_profiles and safe_profiles_with_connection exclude home_address, home_lat, home_lng, phone
-- - get_event_attendees_safe() masks location data based on share_location setting
-- - The app queries through these safe interfaces for cross-user data

CREATE POLICY "Connected users can view profile rows"
ON public.profiles
FOR SELECT
TO public
USING (is_connected_to_profile(id));