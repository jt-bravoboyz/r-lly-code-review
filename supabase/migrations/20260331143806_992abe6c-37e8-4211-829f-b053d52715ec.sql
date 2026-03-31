-- Transfer 30 INTS ownership from Test to JT
UPDATE public.squads 
SET owner_id = '536e4694-245b-48d8-9930-018d72f266e0'
WHERE id = '7ce2becc-524e-4e1e-9e16-825f4fb4bf81';

-- Add JT as a member of Core 4
INSERT INTO public.squad_members (squad_id, profile_id)
VALUES ('b1d67b12-fb5e-4967-9ea8-25c012a3f864', '536e4694-245b-48d8-9930-018d72f266e0')
ON CONFLICT DO NOTHING;

-- Remove Test from Core 4 members
DELETE FROM public.squad_members 
WHERE squad_id = 'b1d67b12-fb5e-4967-9ea8-25c012a3f864' 
AND profile_id = '1902c08c-66b8-4f0d-b3dc-80a090852ce9';

-- Add JT as a member of 30 INTS
INSERT INTO public.squad_members (squad_id, profile_id)
VALUES ('7ce2becc-524e-4e1e-9e16-825f4fb4bf81', '536e4694-245b-48d8-9930-018d72f266e0')
ON CONFLICT DO NOTHING;