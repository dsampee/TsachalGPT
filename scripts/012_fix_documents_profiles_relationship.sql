-- Fix the relationship between documents and profiles tables
-- This script adds the missing foreign key constraint

-- First, ensure all existing documents have valid owner_ids
-- Remove any documents with invalid owner_ids (orphaned records)
DELETE FROM documents 
WHERE owner_id NOT IN (SELECT id FROM profiles);

-- Add the foreign key constraint
ALTER TABLE documents 
ADD CONSTRAINT fk_documents_owner_id 
FOREIGN KEY (owner_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Create an index on owner_id for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);

-- Verify the relationship works
SELECT 
  d.id,
  d.title,
  d.owner_id,
  p.full_name,
  p.email
FROM documents d
LEFT JOIN profiles p ON d.owner_id = p.id
LIMIT 5;
