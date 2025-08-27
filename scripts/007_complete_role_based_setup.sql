-- Complete Role-Based Authentication Setup for TsachalGPT
-- This script creates all necessary tables, policies, and sample users

-- First, ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add role column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Add additional columns to profiles if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'department') THEN
        ALTER TABLE profiles ADD COLUMN department TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create role enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'auditor', 'user');
    END IF;
END $$;

-- Update role column to use enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can create own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Managers can view org documents" ON documents;
DROP POLICY IF EXISTS "Auditors can view audit documents" ON documents;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Documents RLS Policies
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create own documents" ON documents
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Managers can view org documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.id = auth.uid() 
            AND p1.role = 'manager'
            AND p2.id = documents.owner_id
            AND p1.organization = p2.organization
        )
        OR visibility = 'organization'
    );

CREATE POLICY "Auditors can view audit documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'auditor'
        )
        AND document_type = 'audit'
    );

-- Document Versions RLS Policies
CREATE POLICY "Users can view own document versions" ON document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_versions.document_id 
            AND documents.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all document versions" ON document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, organization)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'),
        COALESCE(new.raw_user_meta_data->>'organization', 'Default Organization')
    );
    RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert sample users into auth.users and profiles
-- Note: In production, you would use Supabase Auth API to create these users
-- For now, we'll create the profiles and you'll need to create the auth users manually

-- Sample user profiles (these will be linked to auth users)
INSERT INTO profiles (id, email, full_name, role, organization, department, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'admin@test.com', 'System Administrator', 'admin', 'TsachalGPT Corp', 'IT', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'manager@test.com', 'Project Manager', 'manager', 'TsachalGPT Corp', 'Operations', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'auditor@test.com', 'Senior Auditor', 'auditor', 'TsachalGPT Corp', 'Compliance', true),
    ('550e8400-e29b-41d4-a716-446655440004', 'user1@test.com', 'John Smith', 'user', 'TsachalGPT Corp', 'Sales', true),
    ('550e8400-e29b-41d4-a716-446655440005', 'user2@test.com', 'Jane Doe', 'user', 'TsachalGPT Corp', 'Marketing', true)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    organization = EXCLUDED.organization,
    department = EXCLUDED.department,
    is_active = EXCLUDED.is_active;

-- Create sample documents for testing RLS
INSERT INTO documents (id, owner_id, title, document_type, status, visibility, content, word_count, qa_score) VALUES
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440001', 'Admin System Report', 'report', 'completed', 'private', '{"sections": [{"title": "System Overview", "content": "Administrative system report"}]}', 150, 95),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440002', 'Project Management Proposal', 'proposal', 'completed', 'organization', '{"sections": [{"title": "Project Scope", "content": "Management proposal content"}]}', 200, 88),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440003', 'ISO 9001 Audit Report', 'audit', 'completed', 'organization', '{"sections": [{"title": "Audit Findings", "content": "Compliance audit results"}]}', 300, 92),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440004', 'Sales User Document', 'report', 'draft', 'private', '{"sections": [{"title": "Sales Report", "content": "User sales document"}]}', 120, 85),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440005', 'Marketing Campaign', 'proposal', 'completed', 'public', '{"sections": [{"title": "Campaign Overview", "content": "Marketing proposal"}]}', 180, 90)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);

COMMIT;
