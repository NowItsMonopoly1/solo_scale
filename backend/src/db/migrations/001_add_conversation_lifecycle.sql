-- Migration: Add conversation lifecycle fields
-- Date: 2024-01-15

-- Add new columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- Update status enum to include 'closed'
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('active', 'closed', 'archived'));

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(account_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_closed_at ON conversations(account_id, closed_at DESC);

-- Trigger to update message_count and last_message_at
CREATE OR REPLACE FUNCTION update_conversation_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_metrics_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_metrics();
