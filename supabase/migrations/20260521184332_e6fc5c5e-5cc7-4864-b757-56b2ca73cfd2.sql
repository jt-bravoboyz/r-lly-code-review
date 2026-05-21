-- 1. Convert 3 SECURITY DEFINER views to security_invoker
ALTER VIEW public.safe_profiles SET (security_invoker = true);
ALTER VIEW public.public_profiles SET (security_invoker = true);
ALTER VIEW public.safe_profiles_with_connection SET (security_invoker = true);

-- 2. Revoke EXECUTE from public/anon on internal SECURITY DEFINER functions
--    that strictly require an authenticated session. Authenticated role keeps access.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'rly_award_points(uuid, text, uuid)',
    'rly_award_points_by_profile(uuid, text, uuid)',
    'rly_recalc_user_badge(uuid)',
    'rly_mark_tier_seen(uuid, bigint)',
    'claim_founding_spot(uuid)',
    'set_referral(uuid, uuid)',
    'host_decline_attendee(uuid, uuid)',
    'host_reinvite_attendee(uuid, uuid)',
    'rotate_event_invite_code(uuid, integer)',
    'claim_phone_invites(text, uuid)',
    'cleanup_old_access_logs(integer)',
    'auto_complete_stale_rallies()',
    'auto_archive_stale_after_rallies()',
    'admin_user_directory()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipping missing function: %', fn;
    END;
  END LOOP;
END $$;

-- 3. Storage hardening: drop broad SELECT policies that enable listing on
--    public buckets. Direct public URLs (/object/public/...) still work
--    because the buckets remain flagged public.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Event flyers are publicly readable" ON storage.objects;