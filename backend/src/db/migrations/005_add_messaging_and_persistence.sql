-- Migration: Add Messaging and Persistence Infrastructure
-- Date: 2025-12-28
-- Purpose: Transform SoloScale from stateless utility to persistent business platform

-- ==============================================
-- LEADS ENHANCEMENT (Mortgage-Specific Fields)
-- ==============================================

-- Add mortgage-specific fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ssn_last_4 VARCHAR(4);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loan_amount DECIMAL(12, 2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS credit_tier VARCHAR(20) CHECK (credit_tier IN ('excellent', 'good', 'fair', 'poor', 'unknown'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS retirement_priority_score INTEGER DEFAULT 50 CHECK (retirement_priority_score BETWEEN 0 AND 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to_user_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[]; -- e.g., ['first-time-buyer', 'refinance', 'jumbo']

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_retirement_priority ON leads(account_id, retirement_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(account_id, next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON leads(assigned_to_user_id, status);

-- ==============================================
-- SESSIONS TABLE (Chat Conversation Grouping)
-- ==============================================

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE SET NULL,
  title VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_lead ON sessions(lead_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(account_id, status, last_message_at DESC);

-- ==============================================
-- MESSAGES ENHANCEMENT (Link to Sessions)
-- ==============================================

-- Add session_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(255) REFERENCES sessions(id) ON DELETE CASCADE;

-- Add AI-specific metadata
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model_used VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tokens_used INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3, 2);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS citations TEXT[];

-- Index for session message queries
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at ASC);

-- ==============================================
-- CHASERS TABLE (Automated Follow-ups)
-- ==============================================

CREATE TABLE IF NOT EXISTS chasers (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  chaser_type VARCHAR(50) NOT NULL CHECK (chaser_type IN ('sms', 'email', 'both')),
  reason VARCHAR(500) NOT NULL, -- e.g., "Missing Year-to-Date income on paystub"
  template_used TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),

  -- Scheduling
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,

  -- Delivery tracking
  delivery_status VARCHAR(50),
  delivery_error TEXT,

  -- Response tracking
  responded BOOLEAN DEFAULT false,
  response_received_at TIMESTAMP,

  -- Audit
  created_by_user_id VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for chaser management
CREATE INDEX IF NOT EXISTS idx_chasers_account ON chasers(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chasers_lead ON chasers(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chasers_pending ON chasers(account_id, status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_chasers_lead_status ON chasers(lead_id, status);

-- ==============================================
-- CHASER_RULES TABLE (Auto-Chaser Configuration)
-- ==============================================

CREATE TABLE IF NOT EXISTS chaser_rules (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Trigger conditions
  trigger_event VARCHAR(100) NOT NULL, -- e.g., 'missing_ytd', 'incomplete_w2', 'no_response_72h'
  document_type VARCHAR(100), -- e.g., 'paystub', 'w2', 'bank_statement'

  -- Action configuration
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('sms', 'email', 'both')),
  template_id VARCHAR(255),
  custom_template TEXT,

  -- Timing
  delay_hours INTEGER DEFAULT 0, -- Wait before sending (e.g., 24 hours)
  max_reminders INTEGER DEFAULT 3,
  reminder_interval_hours INTEGER DEFAULT 48,

  -- Audit
  created_by_user_id VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for rule lookups
CREATE INDEX IF NOT EXISTS idx_chaser_rules_account ON chaser_rules(account_id, enabled);
CREATE INDEX IF NOT EXISTS idx_chaser_rules_trigger ON chaser_rules(trigger_event, enabled);

-- ==============================================
-- MESSAGE_TEMPLATES TABLE (Reusable Templates)
-- ==============================================

CREATE TABLE IF NOT EXISTS message_templates (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., 'chaser', 'greeting', 'follow-up'

  -- Template content
  subject VARCHAR(500), -- For emails
  body TEXT NOT NULL,

  -- Variables (e.g., {{client_name}}, {{missing_field}}, {{broker_name}})
  variables TEXT[],

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  -- Audit
  created_by_user_id VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for template management
CREATE INDEX IF NOT EXISTS idx_templates_account ON message_templates(account_id, category);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON message_templates(account_id, usage_count DESC);

-- ==============================================
-- COMPLIANCE_LOGS TABLE (TRID/RESPA Audit Trail)
-- ==============================================

CREATE TABLE IF NOT EXISTS compliance_logs (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE SET NULL,

  -- Event details
  event_type VARCHAR(100) NOT NULL, -- e.g., 'document_extracted', 'chaser_sent', 'disclosure_provided'
  event_data JSONB,

  -- Compliance metadata
  regulatory_category VARCHAR(100), -- e.g., 'TRID', 'RESPA', 'ECOA', 'FCRA'
  disclosure_type VARCHAR(100), -- e.g., 'loan_estimate', 'closing_disclosure'

  -- Audit trail
  performed_by_user_id VARCHAR(255) REFERENCES users(id),
  performed_by_ai BOOLEAN DEFAULT false,
  ai_model VARCHAR(100),

  -- Timestamp
  occurred_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for compliance audits
CREATE INDEX IF NOT EXISTS idx_compliance_account ON compliance_logs(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_lead ON compliance_logs(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_regulatory ON compliance_logs(regulatory_category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_ai ON compliance_logs(account_id, performed_by_ai, occurred_at DESC);

-- ==============================================
-- TRIGGER: Update session last_message_at
-- ==============================================

CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.session_id IS NOT NULL)
  EXECUTE FUNCTION update_session_last_message();

-- ==============================================
-- TRIGGER: Increment template usage count
-- ==============================================

CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_used IS NOT NULL THEN
    UPDATE message_templates
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.template_used;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would require template_used to reference message_templates(id)
-- For now, we'll handle usage tracking in application code

-- ==============================================
-- DEFAULT MESSAGE TEMPLATES (Starter Set)
-- ==============================================

INSERT INTO message_templates (id, account_id, name, description, category, body, variables)
VALUES
  (
    'tmpl_missing_ytd_sms',
    'default', -- System template, copied per account
    'Missing YTD SMS',
    'SMS template for missing Year-to-Date income',
    'chaser',
    'Hi {{client_name}}, this is {{broker_name}}. We need your {{missing_field}} to complete your loan application. Could you please resend? Thanks!',
    ARRAY['client_name', 'broker_name', 'missing_field']
  ),
  (
    'tmpl_incomplete_w2_email',
    'default',
    'Incomplete W-2 Email',
    'Email template for incomplete W-2 forms',
    'chaser',
    'Dear {{client_name}},\n\nThank you for submitting your W-2. However, we noticed {{missing_field}} is missing. Could you please provide a complete copy?\n\nBest regards,\n{{broker_name}}',
    ARRAY['client_name', 'broker_name', 'missing_field']
  ),
  (
    'tmpl_72h_no_response',
    'default',
    '72-Hour Follow-Up',
    'Follow-up for leads with no response after 72 hours',
    'follow-up',
    'Hi {{client_name}}, just checking in! I wanted to see if you had any questions about your loan application. Feel free to reach out anytime. - {{broker_name}}',
    ARRAY['client_name', 'broker_name']
  )
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- VIEWS FOR COMMON QUERIES
-- ==============================================

-- View: Active leads needing follow-up
CREATE OR REPLACE VIEW leads_needing_follow_up AS
SELECT
  l.*,
  COUNT(c.id) FILTER (WHERE c.status = 'sent') as chasers_sent,
  COUNT(c.id) FILTER (WHERE c.status = 'pending') as chasers_pending,
  MAX(c.sent_at) as last_chaser_sent_at
FROM leads l
LEFT JOIN chasers c ON l.id = c.lead_id
WHERE
  l.status IN ('new', 'in_progress')
  AND (l.next_follow_up_date IS NULL OR l.next_follow_up_date <= NOW())
GROUP BY l.id;

-- View: High-priority retirement leads
CREATE OR REPLACE VIEW high_priority_retirement_leads AS
SELECT
  l.*,
  u.name as assigned_user_name,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT m.id) as total_messages
FROM leads l
LEFT JOIN users u ON l.assigned_to_user_id = u.id
LEFT JOIN sessions s ON l.id = s.lead_id
LEFT JOIN messages m ON s.id = m.session_id
WHERE
  l.retirement_priority_score >= 70
  AND l.status NOT IN ('closed', 'lost')
GROUP BY l.id, u.name
ORDER BY l.retirement_priority_score DESC, l.urgency_score DESC;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE sessions IS 'Groups related messages into conversations tied to specific leads';
COMMENT ON TABLE chasers IS 'Tracks automated follow-ups (SMS/Email) for missing documents or non-responsive leads';
COMMENT ON TABLE chaser_rules IS 'Defines automated chaser behavior (e.g., "send SMS if YTD missing after 24h")';
COMMENT ON TABLE message_templates IS 'Reusable message templates with variable substitution';
COMMENT ON TABLE compliance_logs IS 'Audit trail for TRID/RESPA/ECOA compliance (records all AI actions)';

COMMENT ON COLUMN leads.retirement_priority_score IS 'Broker-specific score (0-100) for leads to prioritize before retirement';
COMMENT ON COLUMN leads.credit_tier IS 'Borrower credit tier for risk assessment';
COMMENT ON COLUMN chasers.responded IS 'True if lead responded after chaser was sent';
COMMENT ON COLUMN compliance_logs.performed_by_ai IS 'Indicates if action was taken by AI (vs. human user)';

-- ==============================================
-- ANALYZE TABLES
-- ==============================================

ANALYZE sessions;
ANALYZE chasers;
ANALYZE chaser_rules;
ANALYZE message_templates;
ANALYZE compliance_logs;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify schema additions
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename IN ('sessions', 'chasers', 'chaser_rules', 'message_templates', 'compliance_logs')
ORDER BY tablename;

-- Verify indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('leads', 'sessions', 'messages', 'chasers', 'chaser_rules')
ORDER BY tablename, indexname;
