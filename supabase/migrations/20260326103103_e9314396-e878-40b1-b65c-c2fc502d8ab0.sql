
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email IN ('jt@bravoboyz.com', 'eric@bravoboyz.com', 'nick@bravoboyz.com', 'rally@bravoboyz.com')
ON CONFLICT (user_id, role) DO NOTHING;
