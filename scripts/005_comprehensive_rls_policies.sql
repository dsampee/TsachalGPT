-- Comprehensive Row Level Security Policies for Role-Based Access Control
-- This script implements strict RLS policies to ensure users can only access data appropriate to their role

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with role-based access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- PROFILES TABLE POLICIES
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Managers can view profiles in their organization
CREATE POLICY "Managers can view org profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'manager' 
            AND p.organization = profiles.organization
        )
    );

-- Only admins can insert new profiles (user creation)
CREATE POLICY "Only admins can create profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Users can update their own profile (except role and organization)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
        organization = (SELECT organization FROM profiles WHERE id = auth.uid())
    );

-- Only admins can update roles and organizations
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- DOCUMENTS TABLE POLICIES
-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

-- Managers can view documents in their organization
CREATE POLICY "Managers can view org documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.id = auth.uid() 
            AND p1.role = 'manager'
            AND p2.id = documents.user_id
            AND p1.organization = p2.organization
        )
    );

-- Auditors can view audit-related documents across organizations
CREATE POLICY "Auditors can view audit documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'auditor'
        ) AND document_type IN ('audit', 'compliance')
    );

-- Admins can view all documents
CREATE POLICY "Admins can view all documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Users can insert their own documents
CREATE POLICY "Users can create own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Managers can delete documents in their organization
CREATE POLICY "Managers can delete org documents" ON documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p1, profiles p2
            WHERE p1.id = auth.uid() 
            AND p1.role = 'manager'
            AND p2.id = documents.user_id
            AND p1.organization = p2.organization
        )
    );

-- DOCUMENT_VERSIONS TABLE POLICIES
-- Users can view versions of documents they can access
CREATE POLICY "Users can view accessible document versions" ON document_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_versions.document_id
        )
    );

-- Users can insert versions for their own documents
CREATE POLICY "Users can create versions for own documents" ON document_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = document_id AND d.user_id = auth.uid()
        )
    );

-- Create function to check user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_uuid) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user organization
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT organization FROM profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
