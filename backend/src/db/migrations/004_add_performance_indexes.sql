-- Migration: Add Performance Indexes
-- Date: 2025-12-28
-- Purpose: Improve query performance for frequently accessed data patterns

-- ==============================================
-- AUDIT LOGS INDEXES
-- ==============================================

-- Index for chaser-related audit log queries (most common filter pattern)
-- Used when filtering audit logs by account, resource type, and chaser actions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_chaser
ON audit_logs(account_id, resource_type, resource_id, action)
WHERE action LIKE 'chaser.%';

-- Index for audit log date-range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(account_id, timestamp DESC);

-- ==============================================
-- LEADS INDEXES
-- ==============================================

-- Index for high-value lead queries (urgency score > 90)
-- Used to quickly find hot leads that need immediate attention
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_account_score
ON leads(account_id, urgency_score DESC)
WHERE urgency_score > 90;

-- Index for lead status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_account_status
ON leads(account_id, status, created_at DESC);

-- Index for lead source analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_source
ON leads(account_id, source, created_at DESC);

-- ==============================================
-- DOCUMENT EXTRACTIONS INDEXES
-- ==============================================

-- Index for finding document extractions by lead
-- Used when displaying document history for a specific lead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_extractions_lead
ON document_extractions(lead_id, created_at DESC);

-- Index for finding extractions by account and document type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_extractions_type
ON document_extractions(account_id, document_type, created_at DESC);

-- Index for extraction confidence analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_extractions_confidence
ON document_extractions(account_id, extraction_confidence DESC)
WHERE extraction_confidence < 0.8; -- Low confidence documents need review

-- ==============================================
-- MESSAGES INDEXES
-- ==============================================

-- Index for conversation message queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id, created_at ASC);

-- Index for unread message count queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
ON messages(account_id, read_status, created_at DESC)
WHERE read_status = false;

-- ==============================================
-- CONVERSATIONS INDEXES
-- ==============================================

-- Index for active conversation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_status
ON conversations(account_id, status, updated_at DESC);

-- Index for conversation lead lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_lead
ON conversations(lead_id, updated_at DESC);

-- ==============================================
-- WORKFLOWS INDEXES
-- ==============================================

-- Index for active workflow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_active
ON workflows(account_id, active, updated_at DESC)
WHERE active = true;

-- Index for workflow trigger type queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_trigger
ON workflows(account_id, trigger_type);

-- ==============================================
-- USERS & ACCOUNTS INDEXES
-- ==============================================

-- Index for user email lookup (for authentication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON users(email);

-- Index for account users lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account
ON users(account_id, role);

-- ==============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ==============================================

-- Index for lead dashboard queries (status + urgency + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_dashboard
ON leads(account_id, status, urgency_score DESC, created_at DESC);

-- Index for message analytics (account + direction + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_analytics
ON messages(account_id, direction, created_at DESC);

-- ==============================================
-- ANALYZE TABLES
-- ==============================================

-- Update statistics for query planner
ANALYZE audit_logs;
ANALYZE leads;
ANALYZE document_extractions;
ANALYZE messages;
ANALYZE conversations;
ANALYZE workflows;
ANALYZE users;
ANALYZE accounts;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Run these queries to verify indexes are being used:

-- 1. Check high-value leads query plan
-- EXPLAIN ANALYZE
-- SELECT * FROM leads
-- WHERE account_id = 'acc_123' AND urgency_score > 90
-- ORDER BY urgency_score DESC;

-- 2. Check audit log chaser query plan
-- EXPLAIN ANALYZE
-- SELECT * FROM audit_logs
-- WHERE account_id = 'acc_123'
--   AND resource_type = 'lead'
--   AND action LIKE 'chaser.%'
-- ORDER BY timestamp DESC;

-- 3. Check document extraction history query plan
-- EXPLAIN ANALYZE
-- SELECT * FROM document_extractions
-- WHERE lead_id = 'lead_123'
-- ORDER BY created_at DESC;
