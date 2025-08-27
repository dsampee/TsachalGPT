-- Create 5 sample users with different roles
-- Note: This script creates users in auth.users and corresponding profiles

-- First, we need to create the users in the auth.users table
-- This simulates what would happen when an admin creates users through the UI

-- Sample User 1: Admin
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'admin@test.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "System Administrator"}',
    false,
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Sample User 2: Manager
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'manager@test.com',
    crypt('manager123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Project Manager"}',
    false,
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Sample User 3: Auditor
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'auditor@test.com',
    crypt('auditor123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Quality Auditor"}',
    false,
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Sample User 4: User (TechCorp)
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'user1@test.com',
    crypt('user123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "John Smith"}',
    false,
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Sample User 5: User (MarineCorp)
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'user2@test.com',
    crypt('user123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Sarah Johnson"}',
    false,
    'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding profiles for each user
INSERT INTO profiles (
    id,
    email,
    full_name,
    organization,
    role,
    created_at,
    updated_at
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'admin@test.com',
    'System Administrator',
    'TsachalGPT Admin',
    'admin',
    NOW(),
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222',
    'manager@test.com',
    'Project Manager',
    'TechCorp Solutions',
    'manager',
    NOW(),
    NOW()
),
(
    '33333333-3333-3333-3333-333333333333',
    'auditor@test.com',
    'Quality Auditor',
    'Independent Auditing',
    'auditor',
    NOW(),
    NOW()
),
(
    '44444444-4444-4444-4444-444444444444',
    'user1@test.com',
    'John Smith',
    'TechCorp Solutions',
    'user',
    NOW(),
    NOW()
),
(
    '55555555-5555-5555-5555-555555555555',
    'user2@test.com',
    'Sarah Johnson',
    'MarineCorp Industries',
    'user',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    organization = EXCLUDED.organization,
    role = EXCLUDED.role,
    updated_at = NOW();

-- Create some sample documents to test RLS policies
INSERT INTO documents (
    id,
    user_id,
    title,
    document_type,
    content,
    visibility,
    word_count,
    created_at,
    updated_at
) VALUES 
(
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'TechCorp Project Proposal',
    'proposal',
    '{"title": "TechCorp Project Proposal", "sections": [{"title": "Executive Summary", "content": "This proposal outlines..."}]}',
    'organization',
    500,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    'ISO 9001 Audit Report',
    'audit',
    '{"title": "ISO 9001 Audit Report", "findings": [{"clause": "4.1", "finding": "Non-conformity identified"}]}',
    'private',
    750,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444444',
    'Technical Specification',
    'report',
    '{"title": "Technical Specification", "sections": [{"title": "Requirements", "content": "System requirements..."}]}',
    'private',
    300,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555',
    'Marine Survey Report',
    'marine',
    '{"title": "Marine Survey Report", "vessel": "MV Ocean Explorer", "findings": [{"area": "Hull", "condition": "Good"}]}',
    'organization',
    600,
    NOW(),
    NOW()
);

-- Verify the setup with some test queries
-- These comments show what each role should be able to see:

-- Admin (admin@test.com) should see all documents
-- Manager (manager@test.com) should see TechCorp documents only
-- Auditor (auditor@test.com) should see audit documents across organizations
-- User1 (user1@test.com) should see only their own documents
-- User2 (user2@test.com) should see only their own documents
