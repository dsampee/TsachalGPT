-- Create comprehensive RLS policies for role-based access control

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create role-based RLS policies for profiles
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' AND 
     organization = (SELECT organization FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' AND
    auth.uid() != id -- Prevent admin from deleting themselves
  );

-- Enable RLS on documents table if not already enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;

-- Create role-based RLS policies for documents
CREATE POLICY "documents_select_policy" ON documents
  FOR SELECT USING (
    -- Users can see their own documents
    owner_id = auth.uid() OR
    -- Admins can see all documents
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    -- Managers can see organization documents
    ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' AND 
     visibility IN ('organization', 'public') AND
     (SELECT organization FROM profiles WHERE id = owner_id) = 
     (SELECT organization FROM profiles WHERE id = auth.uid())) OR
    -- Auditors can see audit documents and public documents
    ((SELECT role FROM profiles WHERE id = auth.uid()) = 'auditor' AND 
     (document_type = 'audit' OR visibility = 'public')) OR
    -- All users can see public documents
    visibility = 'public'
  );

CREATE POLICY "documents_insert_policy" ON documents
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY "documents_update_policy" ON documents
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "documents_delete_policy" ON documents
  FOR DELETE USING (
    owner_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Enable RLS on document_versions table if not already enabled
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "document_versions_select_policy" ON document_versions;
DROP POLICY IF EXISTS "document_versions_insert_policy" ON document_versions;
DROP POLICY IF EXISTS "document_versions_update_policy" ON document_versions;
DROP POLICY IF EXISTS "document_versions_delete_policy" ON document_versions;

-- Create role-based RLS policies for document_versions
CREATE POLICY "document_versions_select_policy" ON document_versions
  FOR SELECT USING (
    -- Users can see versions of documents they can access
    EXISTS (
      SELECT 1 FROM documents d 
      WHERE d.id = document_id AND (
        d.owner_id = auth.uid() OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager' AND 
         d.visibility IN ('organization', 'public') AND
         (SELECT organization FROM profiles WHERE id = d.owner_id) = 
         (SELECT organization FROM profiles WHERE id = auth.uid())) OR
        ((SELECT role FROM profiles WHERE id = auth.uid()) = 'auditor' AND 
         (d.document_type = 'audit' OR d.visibility = 'public')) OR
        d.visibility = 'public'
      )
    )
  );

CREATE POLICY "document_versions_insert_policy" ON document_versions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM documents d 
      WHERE d.id = document_id AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY "document_versions_update_policy" ON document_versions
  FOR UPDATE USING (
    created_by = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "document_versions_delete_policy" ON document_versions
  FOR DELETE USING (
    created_by = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create some sample documents for testing RLS
INSERT INTO documents (
  id, owner_id, title, document_type, status, visibility, content, word_count, qa_score, created_at, updated_at
) VALUES 
  (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'admin@test.com'), 'Admin Test Document', 'proposal', 'completed', 'private', '{"title": "Admin Document", "content": "This is an admin document"}', 100, 85, NOW(), NOW()),
  (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'manager@test.com'), 'Manager Test Document', 'report', 'completed', 'organization', '{"title": "Manager Document", "content": "This is a manager document"}', 150, 90, NOW(), NOW()),
  (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'auditor@test.com'), 'Audit Test Document', 'audit', 'completed', 'public', '{"title": "Audit Document", "content": "This is an audit document"}', 200, 95, NOW(), NOW()),
  (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'user1@test.com'), 'User1 Test Document', 'proposal', 'completed', 'private', '{"title": "User1 Document", "content": "This is user1 document"}', 120, 80, NOW(), NOW()),
  (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'user2@test.com'), 'User2 Public Document', 'report', 'completed', 'public', '{"title": "User2 Document", "content": "This is user2 public document"}', 180, 88, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
