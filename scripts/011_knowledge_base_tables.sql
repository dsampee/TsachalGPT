-- Create knowledge base management tables
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_count INTEGER DEFAULT 0,
  current_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge base documents table
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES knowledge_base_categories(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL, -- OpenAI file ID
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER,
  tags JSONB DEFAULT '{}'::jsonb,
  vector_store_id TEXT, -- OpenAI vector store ID
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'indexed', 'error')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge base vector stores table
CREATE TABLE IF NOT EXISTS knowledge_base_vector_stores (
  id TEXT PRIMARY KEY, -- OpenAI vector store ID
  name TEXT NOT NULL,
  category_id UUID REFERENCES knowledge_base_categories(id) ON DELETE SET NULL,
  file_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO knowledge_base_categories (name, description, target_count, tags) VALUES
('proposals', 'Winning Proposals & Bids', 10, '["client", "year", "service_type", "region"]'::jsonb),
('audits', 'Audit Reports with CAPAs', 8, '["iso_standard", "client", "year", "region", "capa_count"]'::jsonb),
('marine_reports', 'Marine & Engineering Reports', 5, '["vessel_type", "client", "year", "region", "inspection_type"]'::jsonb),
('standards', 'ISO & HSE Manuals', 4, '["standard_type", "version", "year"]'::jsonb),
('templates', 'Brand Templates & Boilerplates', 3, '["template_type", "version", "year"]'::jsonb),
('method_statements', 'Method Statements', 3, '["procedure_type", "version", "year", "application"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kb_documents_category ON knowledge_base_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_file_id ON knowledge_base_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_vector_store ON knowledge_base_documents(vector_store_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_uploaded_by ON knowledge_base_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_kb_vector_stores_category ON knowledge_base_vector_stores(category_id);

-- Enable RLS
ALTER TABLE knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_vector_stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge base categories (admin only for management)
CREATE POLICY "Admin can manage categories" ON knowledge_base_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for knowledge base documents
CREATE POLICY "Admin can manage all kb documents" ON knowledge_base_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view kb documents" ON knowledge_base_documents
  FOR SELECT USING (true); -- All authenticated users can view

-- RLS Policies for vector stores
CREATE POLICY "Admin can manage vector stores" ON knowledge_base_vector_stores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view vector stores" ON knowledge_base_vector_stores
  FOR SELECT USING (true); -- All authenticated users can view

-- Create trigger to update category counts
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE knowledge_base_categories 
    SET current_count = current_count + 1,
        updated_at = NOW()
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE knowledge_base_categories 
    SET current_count = GREATEST(current_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_count
  AFTER INSERT OR DELETE ON knowledge_base_documents
  FOR EACH ROW EXECUTE FUNCTION update_category_count();
