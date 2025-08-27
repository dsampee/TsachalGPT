-- Add roles and permissions system to existing database
-- This script extends the current schema with role-based access control

-- Create roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'analyst', 'auditor', 'viewer');

-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'viewer';
ALTER TABLE profiles ADD COLUMN created_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;

-- Create role permissions table
CREATE TABLE role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role user_role NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, resource, action)
);

-- Insert default role permissions
INSERT INTO role_permissions (role, resource, action) VALUES
-- Admin permissions (full access)
('admin', 'users', 'create'),
('admin', 'users', 'read'),
('admin', 'users', 'update'),
('admin', 'users', 'delete'),
('admin', 'documents', 'create'),
('admin', 'documents', 'read'),
('admin', 'documents', 'update'),
('admin', 'documents', 'delete'),
('admin', 'admin', 'access'),

-- Manager permissions
('manager', 'documents', 'create'),
('manager', 'documents', 'read'),
('manager', 'documents', 'update'),
('manager', 'documents', 'delete'),
('manager', 'users', 'read'),

-- Analyst permissions
('analyst', 'documents', 'create'),
('analyst', 'documents', 'read'),
('analyst', 'documents', 'update'),

-- Auditor permissions
('auditor', 'documents', 'create'),
('auditor', 'documents', 'read'),

-- Viewer permissions
('viewer', 'documents', 'read');

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- New RLS policies for profiles with role-based access
CREATE POLICY "Users can view own profile or admins can view all" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile or admins can update all" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Update RLS policies for documents table with role-based access
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- New RLS policies for documents with role-based access
CREATE POLICY "Role-based document read access" ON documents
    FOR SELECT USING (
        -- Own documents
        user_id = auth.uid() OR
        -- Public documents
        visibility = 'public' OR
        -- Organization documents for same org users
        (visibility = 'organization' AND EXISTS (
            SELECT 1 FROM profiles p1, profiles p2 
            WHERE p1.user_id = auth.uid() 
            AND p2.user_id = documents.user_id 
            AND p1.organization = p2.organization
        )) OR
        -- Admins and managers can see all
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Role-based document insert access" ON documents
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'analyst', 'auditor')
        )
    );

CREATE POLICY "Role-based document update access" ON documents
    FOR UPDATE USING (
        -- Own documents
        user_id = auth.uid() OR
        -- Admins and managers can update all
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Role-based document delete access" ON documents
    FOR DELETE USING (
        -- Own documents
        user_id = auth.uid() OR
        -- Admins can delete all
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    user_uuid UUID,
    resource_name TEXT,
    action_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Get user role
    SELECT role INTO user_role_val
    FROM profiles
    WHERE user_id = user_uuid;
    
    -- Check if permission exists
    RETURN EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role = user_role_val
        AND resource = resource_name
        AND action = action_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_organization ON profiles(organization);
CREATE INDEX idx_role_permissions_lookup ON role_permissions(role, resource, action);
CREATE INDEX idx_documents_user_visibility ON documents(user_id, visibility);
