-- Creating API request logging table for comprehensive tracking
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_hash TEXT NOT NULL,
  file_ids TEXT[] DEFAULT '{}',
  token_count INTEGER DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_request_logs(status);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_prompt_hash ON api_request_logs(prompt_hash);

-- Enable RLS
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own API logs" ON api_request_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all API logs" ON api_request_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow system to insert logs
CREATE POLICY "System can insert API logs" ON api_request_logs
  FOR INSERT WITH CHECK (true);
