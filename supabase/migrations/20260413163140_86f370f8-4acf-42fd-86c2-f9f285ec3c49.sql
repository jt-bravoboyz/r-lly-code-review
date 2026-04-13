CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT id,
    user_id,
    display_name,
    avatar_url,
    bio,
    badges,
    reward_points,
    created_at,
    founding_member
FROM profiles;