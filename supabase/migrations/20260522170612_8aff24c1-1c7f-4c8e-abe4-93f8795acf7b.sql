
DO $$
DECLARE
  v_reviewer_user_id uuid;
  v_reviewer_profile_id uuid;
  v_squad_id uuid;
  v_event_id uuid;
  v_chat_id uuid;
  v_buddy_ids uuid[] := ARRAY[]::uuid[];
  v_buddy_profile uuid;
  v_buddy_user uuid;
  v_buddy_emails text[] := ARRAY['demo.jordan@rlly.cloud','demo.casey@rlly.cloud','demo.morgan@rlly.cloud'];
  v_buddy_names text[]  := ARRAY['Jordan','Casey','Morgan'];
  v_email text;
  i int;
BEGIN
  SELECT id INTO v_reviewer_user_id FROM auth.users WHERE email = 'appreview@rlly.cloud';
  IF v_reviewer_user_id IS NULL THEN
    v_reviewer_user_id := gen_random_uuid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES ('00000000-0000-0000-0000-000000000000', v_reviewer_user_id, 'authenticated','authenticated',
      'appreview@rlly.cloud', crypt('R@llyReview2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"App Reviewer","full_name":"App Reviewer"}'::jsonb,
      now(), now(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_reviewer_user_id,
      jsonb_build_object('sub', v_reviewer_user_id::text,'email','appreview@rlly.cloud','email_verified',true),
      'email', v_reviewer_user_id::text, now(), now(), now());
  END IF;

  SELECT id INTO v_reviewer_profile_id FROM public.profiles WHERE user_id = v_reviewer_user_id;
  IF v_reviewer_profile_id IS NULL THEN
    v_reviewer_profile_id := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, display_name, full_name, nickname, bio, policies_accepted_at, needs_name_setup, walkthrough_completed)
    VALUES (v_reviewer_profile_id, v_reviewer_user_id, 'App Reviewer','App Reviewer','appreview',
            'Welcome to R@lly — explore freely.', now(), false, true);
  ELSE
    UPDATE public.profiles
       SET policies_accepted_at = COALESCE(policies_accepted_at, now()),
           needs_name_setup = false, walkthrough_completed = true
     WHERE id = v_reviewer_profile_id;
  END IF;

  FOR i IN 1..3 LOOP
    v_email := v_buddy_emails[i];
    SELECT id INTO v_buddy_user FROM auth.users WHERE email = v_email;
    IF v_buddy_user IS NULL THEN
      v_buddy_user := gen_random_uuid();
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      VALUES ('00000000-0000-0000-0000-000000000000', v_buddy_user, 'authenticated','authenticated',
        v_email, crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('display_name', v_buddy_names[i],'full_name',v_buddy_names[i]),
        now(), now(), '', '', '', '');
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_buddy_user,
        jsonb_build_object('sub', v_buddy_user::text,'email',v_email,'email_verified',true),
        'email', v_buddy_user::text, now(), now(), now());
    END IF;
    SELECT id INTO v_buddy_profile FROM public.profiles WHERE user_id = v_buddy_user;
    IF v_buddy_profile IS NULL THEN
      v_buddy_profile := gen_random_uuid();
      INSERT INTO public.profiles (id, user_id, display_name, full_name, nickname, bio, policies_accepted_at, needs_name_setup, walkthrough_completed)
      VALUES (v_buddy_profile, v_buddy_user, v_buddy_names[i], v_buddy_names[i], lower(v_buddy_names[i]),
              'Demo crew member.', now(), false, true);
    END IF;
    v_buddy_ids := array_append(v_buddy_ids, v_buddy_profile);
  END LOOP;

  FOREACH v_buddy_profile IN ARRAY v_buddy_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.friendships
      WHERE (requester_id = v_reviewer_profile_id AND recipient_id = v_buddy_profile)
         OR (recipient_id = v_reviewer_profile_id AND requester_id = v_buddy_profile)
    ) THEN
      INSERT INTO public.friendships (requester_id, recipient_id, status, responded_at)
      VALUES (v_reviewer_profile_id, v_buddy_profile, 'accepted', now());
    END IF;
  END LOOP;

  SELECT id INTO v_squad_id FROM public.squads
   WHERE owner_id = v_reviewer_profile_id AND name = 'Demo Crew' LIMIT 1;
  IF v_squad_id IS NULL THEN
    v_squad_id := gen_random_uuid();
    INSERT INTO public.squads (id, name, owner_id, symbol)
    VALUES (v_squad_id, 'Demo Crew', v_reviewer_profile_id, 'shield');
  END IF;
  INSERT INTO public.squad_members (squad_id, profile_id) VALUES (v_squad_id, v_reviewer_profile_id)
    ON CONFLICT (squad_id, profile_id) DO NOTHING;
  FOREACH v_buddy_profile IN ARRAY v_buddy_ids LOOP
    INSERT INTO public.squad_members (squad_id, profile_id) VALUES (v_squad_id, v_buddy_profile)
      ON CONFLICT (squad_id, profile_id) DO NOTHING;
  END LOOP;

  SELECT id INTO v_event_id FROM public.events
   WHERE creator_id = v_reviewer_profile_id AND title = 'Demo Night — Welcome, Reviewer' LIMIT 1;
  IF v_event_id IS NULL THEN
    v_event_id := gen_random_uuid();
    INSERT INTO public.events (id, creator_id, title, description, event_type, status,
      start_time, end_time, location_name, location_lat, location_lng, is_quick_rally, flyer_theme)
    VALUES (v_event_id, v_reviewer_profile_id,
      'Demo Night — Welcome, Reviewer',
      'A live demo R@lly for App Review. Tap around — everything is safe to explore.',
      'rally', 'live',
      now() - interval '1 hour', '2030-12-31 23:59:00+00',
      'The Roof — 230 5th Ave, New York, NY', 40.7440, -73.9876, false, 'rally_dynamic');
  END IF;

  INSERT INTO public.event_attendees (event_id, profile_id, status, location_prompt_shown)
  VALUES (v_event_id, v_reviewer_profile_id, 'attending', true) ON CONFLICT DO NOTHING;
  FOREACH v_buddy_profile IN ARRAY v_buddy_ids LOOP
    INSERT INTO public.event_attendees (event_id, profile_id, status, location_prompt_shown)
    VALUES (v_event_id, v_buddy_profile, 'attending', true) ON CONFLICT DO NOTHING;
  END LOOP;

  SELECT id INTO v_chat_id FROM public.chats
   WHERE event_id = v_event_id OR linked_event_id = v_event_id
   ORDER BY created_at LIMIT 1;
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (chat_id, profile_id) VALUES (v_chat_id, v_reviewer_profile_id) ON CONFLICT DO NOTHING;
    FOREACH v_buddy_profile IN ARRAY v_buddy_ids LOOP
      INSERT INTO public.chat_participants (chat_id, profile_id) VALUES (v_chat_id, v_buddy_profile) ON CONFLICT DO NOTHING;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.messages WHERE chat_id = v_chat_id AND content LIKE 'Welcome to R@lly%') THEN
      INSERT INTO public.messages (chat_id, sender_id, content, message_type)
      VALUES (v_chat_id, v_buddy_ids[1],
              'Welcome to R@lly 👋 — tap around, everything''s safe to explore.', 'text');
    END IF;
  END IF;
END $$;
