-- Calendar MCP App - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
-- Connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  app_name TEXT NOT NULL DEFAULT 'googlecalendar',
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, app_name)
);
-- Create index on user_id and status
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
-- Meetings cache table
CREATE TABLE IF NOT EXISTS meetings_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL,
  -- 'upcoming' or 'past'
  meetings_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, meeting_type)
);
-- Create index on user_id and meeting_type
CREATE INDEX IF NOT EXISTS idx_meetings_cache_user_type ON meetings_cache(user_id, meeting_type);
-- AI Summaries table
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  is_mock BOOLEAN DEFAULT FALSE,
  tokens_used INTEGER,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);
-- Create index on meeting_id and user_id
CREATE INDEX IF NOT EXISTS idx_ai_summaries_meeting_user ON ai_summaries(meeting_id, user_id);
-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create index on user_id and created_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';
-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at BEFORE
UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- Create policies for service role (bypass RLS for backend)
-- Note: In production, you'd want more granular policies based on authenticated users
-- Allow service role to do everything (for backend API)
CREATE POLICY "Service role can do everything on users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on connections" ON connections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on meetings_cache" ON meetings_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on ai_summaries" ON ai_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on analytics_events" ON analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Allow anonymous access for development (remove in production)
CREATE POLICY "Allow anonymous access to users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to connections" ON connections FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to meetings_cache" ON meetings_cache FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to ai_summaries" ON ai_summaries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to analytics_events" ON analytics_events FOR ALL TO anon USING (true) WITH CHECK (true);
-- Create a view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT u.user_id,
  u.name,
  u.email,
  COUNT(DISTINCT c.id) as connection_count,
  COUNT(DISTINCT s.id) as summary_count,
  MAX(s.created_at) as last_summary_at,
  COUNT(DISTINCT a.id) as event_count,
  u.created_at as user_created_at
FROM users u
  LEFT JOIN connections c ON u.user_id = c.user_id
  LEFT JOIN ai_summaries s ON u.user_id = s.user_id
  LEFT JOIN analytics_events a ON u.user_id = a.user_id
GROUP BY u.user_id,
  u.name,
  u.email,
  u.created_at;
-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user information and entity mappings';
COMMENT ON TABLE connections IS 'Stores calendar connections via Composio';
COMMENT ON TABLE meetings_cache IS 'Caches meeting data to reduce API calls';
COMMENT ON TABLE ai_summaries IS 'Stores AI-generated meeting summaries';
COMMENT ON TABLE analytics_events IS 'Tracks user events for analytics';
COMMENT ON COLUMN users.entity_id IS 'Composio entity ID for this user';
COMMENT ON COLUMN connections.metadata IS 'Additional connection metadata (JSON)';
COMMENT ON COLUMN meetings_cache.meetings_data IS 'Cached meeting array (JSON)';
COMMENT ON COLUMN ai_summaries.is_mock IS 'Whether this is a mock summary (no OpenAI)';