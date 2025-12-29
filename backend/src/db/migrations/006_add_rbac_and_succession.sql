-- Migration: Add RBAC and Succession Layer
-- Date: 2025-12-28
-- Purpose: Support senior_partner/junior_broker roles and automatic lead reassignment

-- ==============================================
-- USERS TABLE ENHANCEMENT (Add Role Column)
-- ==============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'junior_broker'
  CHECK (role IN ('senior_partner', 'junior_broker', 'admin'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS senior_partner_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.role IS 'User role: senior_partner (firm owner), junior_broker (employee), admin (system admin)';
COMMENT ON COLUMN users.senior_partner_id IS 'For junior brokers, the senior partner who oversees their leads';

-- ==============================================
-- LEADS TABLE ENHANCEMENT (Reassignment Tracking)
-- ==============================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS previous_assigned_to VARCHAR(255);

COMMENT ON COLUMN leads.last_assigned_at IS 'Timestamp when lead was last assigned to current user (for 15min timeout)';
COMMENT ON COLUMN leads.reassignment_count IS 'Number of times lead has been reassigned (indicates problem leads)';
COMMENT ON COLUMN leads.previous_assigned_to IS 'Previous assignee before reassignment (for audit trail)';

-- ==============================================
-- LEAD_ACTIVITY_LOG TABLE (Track All Lead Interactions)
-- ==============================================

CREATE TABLE IF NOT EXISTS lead_activity_log (
  id VARCHAR(255) PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Activity details
  activity_type VARCHAR(100) NOT NULL, -- 'assigned', 'reassigned', 'status_changed', 'contacted', 'document_uploaded'
  performed_by_user_id VARCHAR(255) REFERENCES users(id),
  performed_by_ai BOOLEAN DEFAULT false,

  -- Activity data
  activity_data JSONB, -- e.g., { "from_status": "new", "to_status": "in_progress", "reason": "15min timeout" }

  -- Timestamp
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_lead ON lead_activity_log(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activity_user ON lead_activity_log(performed_by_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activity_type ON lead_activity_log(activity_type, occurred_at DESC);

COMMENT ON TABLE lead_activity_log IS 'Audit trail of all lead interactions for partner performance tracking';

-- ==============================================
-- PARTNER_PERFORMANCE TABLE (Aggregated Metrics)
-- ==============================================

CREATE TABLE IF NOT EXISTS partner_performance (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Performance metrics
  total_leads_assigned INTEGER DEFAULT 0,
  leads_converted INTEGER DEFAULT 0,
  leads_lost INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER, -- Average time to first contact
  reassignments_received INTEGER DEFAULT 0, -- Times they received a reassigned lead
  reassignments_given INTEGER DEFAULT 0, -- Times their leads were reassigned away

  -- Activity tracking
  last_active_at TIMESTAMP,
  total_messages_sent INTEGER DEFAULT 0,
  total_documents_processed INTEGER DEFAULT 0,

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_partner_perf_user ON partner_performance(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_partner_perf_account ON partner_performance(account_id, period_start DESC);

COMMENT ON TABLE partner_performance IS 'Weekly/monthly partner performance metrics for senior partner dashboard';

-- ==============================================
-- REASSIGNMENT_RULES TABLE (Automatic Reassignment Configuration)
-- ==============================================

CREATE TABLE IF NOT EXISTS reassignment_rules (
  id VARCHAR(255) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,

  -- Trigger conditions
  inactivity_minutes INTEGER DEFAULT 15, -- Reassign if no activity after 15 minutes
  applies_to_roles TEXT[] DEFAULT ARRAY['junior_broker'], -- Which roles this rule applies to

  -- Action configuration
  reassign_to_senior BOOLEAN DEFAULT true, -- Reassign to senior partner
  notification_type VARCHAR(50) DEFAULT 'sms' CHECK (notification_type IN ('sms', 'email', 'both', 'none')),

  -- Audit
  created_by_user_id VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reassignment_rules_account ON reassignment_rules(account_id, enabled);

COMMENT ON TABLE reassignment_rules IS 'Configurable rules for automatic lead reassignment (e.g., 15min timeout)';

-- ==============================================
-- DEFAULT REASSIGNMENT RULE (15-Minute Timeout)
-- ==============================================

INSERT INTO reassignment_rules (id, account_id, rule_name, enabled, inactivity_minutes, applies_to_roles, reassign_to_senior, notification_type)
VALUES (
  'rule_default_15min_timeout',
  'default', -- System default, copied per account
  '15-Minute Inactivity Reassignment',
  true,
  15,
  ARRAY['junior_broker'],
  true,
  'sms'
) ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- VIEWS FOR PARTNER DASHBOARD
-- ==============================================

-- View: Senior Partner's Team Overview
CREATE OR REPLACE VIEW senior_partner_team_overview AS
SELECT
  sp.id as senior_partner_id,
  sp.name as senior_partner_name,
  sp.account_id,
  COUNT(DISTINCT jb.id) as total_junior_brokers,
  COUNT(DISTINCT l.id) as total_team_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'new') as new_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'in_progress') as in_progress_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.assigned_to_user_id = sp.id) as leads_assigned_to_senior,
  COUNT(DISTINCT l.id) FILTER (WHERE l.reassignment_count > 0) as reassigned_leads
FROM users sp
LEFT JOIN users jb ON jb.senior_partner_id = sp.id
LEFT JOIN leads l ON (l.assigned_to_user_id = sp.id OR l.assigned_to_user_id = jb.id)
WHERE sp.role = 'senior_partner'
GROUP BY sp.id, sp.name, sp.account_id;

COMMENT ON VIEW senior_partner_team_overview IS 'High-level metrics for senior partner dashboard';

-- View: Leads Needing Reassignment (15min timeout)
CREATE OR REPLACE VIEW leads_needing_reassignment AS
SELECT
  l.*,
  u.name as assigned_user_name,
  u.role as assigned_user_role,
  u.senior_partner_id,
  sp.name as senior_partner_name,
  EXTRACT(EPOCH FROM (NOW() - l.last_assigned_at)) / 60 as minutes_since_assignment,
  rr.inactivity_minutes as timeout_threshold
FROM leads l
JOIN users u ON l.assigned_to_user_id = u.id
LEFT JOIN users sp ON u.senior_partner_id = sp.id
JOIN reassignment_rules rr ON rr.account_id = l.account_id AND rr.enabled = true
WHERE
  l.status IN ('new', 'in_progress')
  AND u.role = ANY(rr.applies_to_roles)
  AND EXTRACT(EPOCH FROM (NOW() - l.last_assigned_at)) / 60 > rr.inactivity_minutes
  AND NOT EXISTS (
    SELECT 1 FROM lead_activity_log lag
    WHERE lag.lead_id = l.id
      AND lag.activity_type IN ('contacted', 'status_changed')
      AND lag.occurred_at > l.last_assigned_at
  );

COMMENT ON VIEW leads_needing_reassignment IS 'Leads that have exceeded inactivity threshold and need reassignment';

-- ==============================================
-- FUNCTION: Reassign Lead to Senior Partner
-- ==============================================

CREATE OR REPLACE FUNCTION reassign_lead_to_senior(lead_id_param VARCHAR)
RETURNS VOID AS $$
DECLARE
  current_assignee_id VARCHAR;
  senior_id VARCHAR;
  account_id_var VARCHAR;
BEGIN
  -- Get current assignment details
  SELECT assigned_to_user_id, account_id INTO current_assignee_id, account_id_var
  FROM leads
  WHERE id = lead_id_param;

  -- Get senior partner ID
  SELECT senior_partner_id INTO senior_id
  FROM users
  WHERE id = current_assignee_id;

  IF senior_id IS NULL THEN
    RAISE NOTICE 'No senior partner found for user %, skipping reassignment', current_assignee_id;
    RETURN;
  END IF;

  -- Update lead assignment
  UPDATE leads
  SET
    assigned_to_user_id = senior_id,
    previous_assigned_to = current_assignee_id,
    last_assigned_at = NOW(),
    reassignment_count = reassignment_count + 1,
    updated_at = NOW()
  WHERE id = lead_id_param;

  -- Log reassignment activity
  INSERT INTO lead_activity_log (id, lead_id, account_id, activity_type, performed_by_ai, activity_data, occurred_at)
  VALUES (
    'log_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || substr(md5(random()::text), 1, 8),
    lead_id_param,
    account_id_var,
    'reassigned',
    true,
    jsonb_build_object(
      'from_user_id', current_assignee_id,
      'to_user_id', senior_id,
      'reason', '15-minute inactivity timeout',
      'automatic', true
    ),
    NOW()
  );

  RAISE NOTICE 'Lead % reassigned from % to senior partner %', lead_id_param, current_assignee_id, senior_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reassign_lead_to_senior IS 'Automatically reassigns a lead from junior broker to their senior partner';

-- ==============================================
-- TRIGGER: Log Lead Assignment Changes
-- ==============================================

CREATE OR REPLACE FUNCTION log_lead_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
    INSERT INTO lead_activity_log (id, lead_id, account_id, activity_type, performed_by_ai, activity_data, occurred_at)
    VALUES (
      'log_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || substr(md5(random()::text), 1, 8),
      NEW.id,
      NEW.account_id,
      'assigned',
      false,
      jsonb_build_object(
        'from_user_id', OLD.assigned_to_user_id,
        'to_user_id', NEW.assigned_to_user_id
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_lead_assignment
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id)
  EXECUTE FUNCTION log_lead_assignment_change();

-- ==============================================
-- ANALYZE TABLES
-- ==============================================

ANALYZE lead_activity_log;
ANALYZE partner_performance;
ANALYZE reassignment_rules;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('role', 'senior_partner_id');

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads' AND column_name IN ('last_assigned_at', 'reassignment_count', 'previous_assigned_to');

-- Verify new tables
SELECT tablename FROM pg_tables
WHERE tablename IN ('lead_activity_log', 'partner_performance', 'reassignment_rules')
ORDER BY tablename;
