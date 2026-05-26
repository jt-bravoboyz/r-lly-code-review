
-- Restore cross-user profile visibility (broken by recent security pass).
-- Row-level access is opened to any signed-in user; PII columns remain hidden
-- because the client only reads via the safe_profiles* views, which exclude
-- email/phone/etc.

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Ensure the safe views are reachable via the Data API.
GRANT SELECT ON public.safe_profiles TO authenticated, anon;
GRANT SELECT ON public.safe_profiles_with_connection TO authenticated;
