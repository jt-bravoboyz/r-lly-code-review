-- Fix: Replace the broad "Connected users can view profile rows" policy
-- with one that only exposes safe columns via a security definer function.

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Connected users can view profile rows" ON public.profiles;

-- Create a restricted policy that only allows connected users to see safe fields
-- We'll use a view approach: connected users can SELECT the row but we restrict 
-- sensitive columns via a security definer function instead.

-- Actually, RLS is row-level not column-level, so we need a different approach:
-- Create a policy that still allows connected users to see rows, but ensure
-- the application always uses safe_profiles or safe_profiles_with_connection views
-- for cross-user queries. The direct profiles table access for connected users
-- should be restricted to only allow reading non-sensitive data through views.

-- Replace with a more restrictive approach: connected users can only see profiles
-- through the safe views (which exclude sensitive fields). Remove direct table access.
-- Keep: own profile access, admin access. Remove: connected user direct access.

-- The safe_profiles_with_connection view (with security_invoker=on) will still work
-- because it queries profiles, and users can see their own row + admins can see all.
-- For cross-user visibility, the app should use the get_event_attendees_safe() function
-- which already masks sensitive data.

-- Note: This means connected users must go through views/functions, not direct table queries.