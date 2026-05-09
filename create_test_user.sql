-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/fplbsepqpqtzkyyskyol/sql/new)
-- This will create a test user that you can use to log in immediately.

-- 1. Create the user in Auth
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@tripnepal.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Traveler","role":"tourist"}',
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Ensure the identity exists
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001', 'test@tripnepal.com')::jsonb,
    'email',
    now(),
    now(),
    now()
) ON CONFLICT (id, provider) DO NOTHING;

-- Note: The profile will be created automatically by the trigger we set up in migration 001.
