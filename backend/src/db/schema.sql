-- SoloScale Multi-Tenant Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ACCOUNTS & USERS (Multi-tenancy)
-- ============================================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_name TEXT,
  plan TEXT NOT NULL DEFAULT 'pro', -- 'free', 'pro', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE account_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

CREATE INDEX idx_account_memberships_account ON account_memberships(account_id);
CREATE INDEX idx_account_memberships_user ON account_memberships(user_id);

-- ============================================================================
-- LEADS & REALTORS
-- ============================================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Contact Info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- TCPA Compliance
  sms_opt_in BOOLEAN DEFAULT false,
  email_opt_in BOOLEAN DEFAULT false,
  opt_in_source TEXT,
  opt_in_timestamp TIMESTAMPTZ,

  -- Lead Data
  content TEXT,
  raw_source TEXT,
  source_type TEXT, -- 'floify', 'salesforce', 'manual', 'web'
  external_id TEXT, -- Floify borrower ID, Salesforce lead ID

  -- AI Scoring
  urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 100),
  ai_analysis TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'dead'

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_account ON leads(account_id);
CREATE INDEX idx_leads_external_id ON leads(account_id, external_id);
CREATE INDEX idx_leads_status ON leads(account_id, status);
CREATE INDEX idx_leads_urgency ON leads(account_id, urgency_score DESC);

CREATE TABLE realtors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,

  -- Communication preferences
  preferred_contact_method TEXT DEFAULT 'email', -- 'email', 'sms', 'phone'

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_realtors_account ON realtors(account_id);

-- ============================================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  realtor_id UUID REFERENCES realtors(id) ON DELETE SET NULL,

  subject TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'closed', 'archived'

  -- AI-generated summary when conversation is closed
  ai_summary TEXT,
  ai_summary_generated_at TIMESTAMPTZ,

  -- Conversation metrics
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,

  -- Closure information
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  close_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_account ON conversations(account_id);
CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_status ON conversations(account_id, status);
CREATE INDEX idx_conversations_closed_at ON conversations(account_id, closed_at DESC);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Message details
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  channel TEXT NOT NULL, -- 'sms', 'email'

  -- Participants
  from_number TEXT,
  to_number TEXT,
  from_email TEXT,
  to_email TEXT,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,

  -- AI Generated
  ai_generated BOOLEAN DEFAULT false,
  ai_compliance_status TEXT, -- 'ok', 'warning', 'blocked'

  -- Delivery
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  provider_message_id TEXT,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_account ON messages(account_id);
CREATE INDEX idx_messages_status ON messages(status);

-- ============================================================================
-- WORKFLOWS & AUTOMATION
-- ============================================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL, -- 'floify_milestone', 'salesforce_stage', 'time_delay', 'manual'
  trigger_config JSONB NOT NULL DEFAULT '{}',

  -- Workflow definition (node-edge graph)
  definition JSONB NOT NULL,

  -- Status
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_workflows_account ON workflows(account_id);
CREATE INDEX idx_workflows_active ON workflows(account_id, active);

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Context
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  trigger_event_id UUID,

  -- Execution state
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  current_node TEXT,
  execution_log JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT
);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_account ON workflow_runs(account_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Source
  provider TEXT NOT NULL, -- 'floify', 'salesforce'
  event_type TEXT NOT NULL, -- 'milestone_changed', 'stage_updated', etc.
  external_id TEXT,

  -- Payload
  payload JSONB NOT NULL,

  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_events_account ON integration_events(account_id);
CREATE INDEX idx_integration_events_processed ON integration_events(processed, created_at);

-- ============================================================================
-- TEMPLATES
-- ============================================================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Template type
  type TEXT NOT NULL, -- 'sms', 'email'

  -- Content (supports {{variables}})
  subject TEXT,
  body TEXT NOT NULL,

  -- AI Enhancement
  ai_enhanced BOOLEAN DEFAULT false,

  -- Status
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_templates_account ON templates(account_id);
CREATE INDEX idx_templates_type ON templates(account_id, type);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL, -- 'message.sent', 'workflow.executed', 'template.edited', etc.
  resource_type TEXT NOT NULL,
  resource_id UUID,

  -- Context
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_account ON audit_logs(account_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  plan TEXT NOT NULL, -- 'pro', 'enterprise'
  status TEXT NOT NULL, -- 'active', 'trialing', 'past_due', 'cancelled'

  usage_limit INTEGER NOT NULL,
  current_usage INTEGER DEFAULT 0,

  -- Billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Dates
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_account ON subscriptions(account_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_realtors_updated_at BEFORE UPDATE ON realtors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
