-- Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
-- Migration: 006_performance_indexes.sql
-- Purpose: Add composite indexes for query performance optimization
-- Created: 2025-01-15

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Loans table: location + status filter (used in GET /loans with status filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_location_status
    ON loans(location_id, status);

-- Loans table: location + created_at DESC (used for default loan list sorting)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_location_created_at
    ON loans(location_id, created_at DESC);

-- Loans table: location + updated_at DESC (used for recently modified queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_location_updated_at
    ON loans(location_id, updated_at DESC);

-- Documents table: loan + OCR status (used for document processing status checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_loan_ocr_status
    ON documents(loan_id, ocr_status);

-- Documents table: loan + document type (used for specific document lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_loan_type
    ON documents(loan_id, document_type);

-- Escalations table: location + type + created_at (compliance reporting queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escalations_location_type_created
    ON escalations(location_id, escalation_type, created_at DESC);

-- Escalations table: location + status (active escalation filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escalations_location_status
    ON escalations(location_id, status);

-- Borrowers table: loan_id (frequently joined)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrowers_loan_id
    ON borrowers(loan_id);

-- Income calculations table: loan_id (frequently queried with loans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_calculations_loan_id
    ON income_calculations(loan_id);

-- ============================================================================
-- AUDIT LOG INDEXES FOR COMPLIANCE REPORTING
-- ============================================================================

-- AI interaction logs: location + created_at (usage analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_interaction_logs_location_created
    ON ai_interaction_logs(location_id, created_at DESC);

-- Audit logs: location + action + created_at (audit trail queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_location_action_created
    ON audit_logs(location_id, action, created_at DESC);

-- ============================================================================
-- GIN INDEXES FOR JSONB FIELD SEARCHES
-- ============================================================================

-- Audit logs details JSONB (search within audit details)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_details_gin
    ON audit_logs USING GIN(details);

-- Escalations details JSONB (search within escalation details)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escalations_details_gin
    ON escalations USING GIN(details);

-- Income calculations notes JSONB (search within calculation notes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_income_calculations_notes_gin
    ON income_calculations USING GIN(notes);

-- Documents OCR data JSONB (search within extracted OCR data)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_ocr_data_gin
    ON documents USING GIN(ocr_data);

-- ============================================================================
-- ADMIN TABLES INDEXES
-- ============================================================================

-- Admin audit logs: admin_user_id + created_at (user activity tracking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_logs_user_created
    ON admin_audit_logs(admin_user_id, created_at DESC);

-- Admin audit logs: action + created_at (action type filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_logs_action_created
    ON admin_audit_logs(action, created_at DESC);

-- Domain requests: location_id + status (pending domain requests)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_requests_location_status
    ON domain_requests(location_id, status);

-- ============================================================================
-- TENANT BRANDING INDEX
-- ============================================================================

-- Tenant branding: tier (for tier-based queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_branding_tier
    ON tenant_branding(tier);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER STATISTICS
-- ============================================================================

ANALYZE loans;
ANALYZE documents;
ANALYZE borrowers;
ANALYZE escalations;
ANALYZE income_calculations;
ANALYZE ai_interaction_logs;
ANALYZE audit_logs;
ANALYZE admin_audit_logs;
ANALYZE domain_requests;
ANALYZE tenant_branding;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_loans_location_status IS 'Composite index for filtered loan queries by status within a location';
COMMENT ON INDEX idx_loans_location_created_at IS 'Composite index for loan list pagination sorted by creation date';
COMMENT ON INDEX idx_escalations_location_type_created IS 'Composite index for compliance reporting date-range queries';
COMMENT ON INDEX idx_documents_loan_ocr_status IS 'Composite index for document processing status checks';
