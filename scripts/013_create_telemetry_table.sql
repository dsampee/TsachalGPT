-- Create telemetry table for document generation tracking
CREATE TABLE IF NOT EXISTS document_telemetry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  duration_ms integer DEFAULT 0,
  score integer DEFAULT 0,
  document_title text,
  status text DEFAULT 'completed'
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON document_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_by ON document_telemetry(created_by);

-- Enable RLS
ALTER TABLE document_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all telemetry" ON document_telemetry
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own telemetry" ON document_telemetry
  FOR INSERT WITH CHECK (auth.uid() = created_by OR auth.uid() IS NULL);
