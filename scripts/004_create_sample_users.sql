-- Create 5 sample users with different roles
-- Note: These users will be created via the admin interface, this script sets up the framework

-- First, we need to create a function that can be called to set up sample users
-- This will be used by the admin interface to create users programmatically

CREATE OR REPLACE FUNCTION create_sample_user(
    email_param TEXT,
    password_param TEXT,
    full_name_param TEXT,
    organization_param TEXT,
    role_param user_role
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- This function will be called from the application layer
    -- It returns the user_id that should be used when creating the auth user
    new_user_id := gen_random_uuid();
    
    -- Insert into profiles (the auth.users record will be created via Supabase Admin API)
    INSERT INTO profiles (
        user_id,
        full_name,
        organization,
        role,
        created_by,
        is_active
    ) VALUES (
        new_user_id,
        full_name_param,
        organization_param,
        role_param,
        (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), -- Created by first admin
        true
    );
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample user data that will be created via the admin interface:
-- 1. admin@test.com - Admin role (full access)
-- 2. manager@test.com - Manager role (document management + user read)
-- 3. analyst@test.com - Analyst role (document create/read/update)
-- 4. auditor@test.com - Auditor role (document create/read)
-- 5. viewer@test.com - Viewer role (document read only)

-- Create a view for easy user management
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
    p.user_id,
    au.email,
    p.full_name,
    p.organization,
    p.role,
    p.is_active,
    p.created_at,
    p.last_login,
    CASE 
        WHEN p.role = 'admin' THEN 'Full system access'
        WHEN p.role = 'manager' THEN 'Document management + user read'
        WHEN p.role = 'analyst' THEN 'Document create/read/update'
        WHEN p.role = 'auditor' THEN 'Document create/read'
        WHEN p.role = 'viewer' THEN 'Document read only'
    END as role_description
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
ORDER BY p.created_at;

-- Grant access to the view for admins only
CREATE POLICY "Only admins can view user management" ON user_management_view
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
