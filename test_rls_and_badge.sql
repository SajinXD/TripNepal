BEGIN;

DO $$
DECLARE
  v_guide_id uuid := gen_random_uuid();
  v_tourist1_id uuid := gen_random_uuid();
  v_tourist2_id uuid := gen_random_uuid();
  v_booking_id uuid := gen_random_uuid();
  v_thread_id uuid := gen_random_uuid();
  v_badge_count int;
  v_messages_count int;
BEGIN
  
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_guide_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guide_test@example.com');
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_tourist1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'touristA@example.com');
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_tourist2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'touristB@example.com');

  UPDATE public.profiles SET role = 'guide' WHERE id = v_guide_id;
  INSERT INTO public.guide_profiles (id) VALUES (v_guide_id);

  
  INSERT INTO public.bookings (id, tourist_id, guide_id, status, start_date, end_date)
  VALUES (v_booking_id, v_tourist1_id, v_guide_id, 'requested', CURRENT_DATE, CURRENT_DATE + 3);

  
  UPDATE public.bookings SET status = 'accepted' WHERE id = v_booking_id;
  INSERT INTO public.chat_threads (id, booking_id, tourist_id, guide_id)
  VALUES (v_thread_id, v_booking_id, v_tourist1_id, v_guide_id);

  INSERT INTO public.chat_messages (thread_id, sender_id, message)
  VALUES (v_thread_id, v_tourist1_id, 'Hello guide!');

  
  INSERT INTO public.bookings (tourist_id, guide_id, status, start_date, end_date)
  VALUES (v_tourist2_id, v_guide_id, 'requested', CURRENT_DATE, CURRENT_DATE + 1);

  SELECT count(*) INTO v_badge_count
  FROM public.bookings
  WHERE guide_id = v_guide_id AND status = 'requested';

  ASSERT v_badge_count = 1, 'Badge count should be 1';

  
  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_tourist2_id), true);

  
  SELECT count(*) INTO v_messages_count FROM public.chat_messages WHERE thread_id = v_thread_id;
  ASSERT v_messages_count = 0, 'RLS LEAK: Tourist B can read Tourist As messages!';

  RAISE NOTICE 'ALL TESTS PASSED: Badge is correct, RLS is secure.';
END $$;

ROLLBACK;
