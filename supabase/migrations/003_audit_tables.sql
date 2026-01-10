-- Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
-- AUMA GHL Marketplace App - Audit Tables and Logging

-- Audit Logs (comprehensive activity tracking for compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    performed_by VARCHAR(100) NOT NULL, -- 'human_processor', 'ai_assistant', 'borrower', 'mlo', 'system'
    ai_confidence DECIMAL(5, 4), -- For AI-performed actions
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_loan ON audit_logs(loan_id);
CREATE INDEX idx_audit_logs_location ON audit_logs(location_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs: Full isolation by location_id
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    FOR ALL
    USING (location_id = current_location_id());

CREATE POLICY audit_logs_service_bypass ON audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Loan Status History (track all status changes)
CREATE TABLE loan_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    previous_status loan_status,
    new_status loan_status NOT NULL,
    changed_by VARCHAR(100) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loan_status_history_loan ON loan_status_history(loan_id);
CREATE INDEX idx_loan_status_history_created_at ON loan_status_history(created_at);

-- Enable RLS on loan_status_history
ALTER TABLE loan_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY loan_status_history_tenant_isolation ON loan_status_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = loan_status_history.loan_id
            AND loans.location_id = current_location_id()
        )
    );

CREATE POLICY loan_status_history_service_bypass ON loan_status_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Trigger to automatically log status changes
CREATE OR REPLACE FUNCTION log_loan_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO loan_status_history (loan_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_loan_status_change
    AFTER UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION log_loan_status_change();

-- Document Version History (track document re-uploads)
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    checksum VARCHAR(64),
    ocr_data JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);

-- Enable RLS on document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_versions_tenant_isolation ON document_versions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM documents
            JOIN loans ON loans.id = documents.loan_id
            WHERE documents.id = document_versions.document_id
            AND loans.location_id = current_location_id()
        )
    );

CREATE POLICY document_versions_service_bypass ON document_versions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- AI Interaction Logs (for SAFE Act compliance auditing)
CREATE TABLE ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'document_ocr', 'income_calc', 'compliance_check', 'message_response'
    input_summary TEXT,
    output_summary TEXT,
    model_used VARCHAR(50),
    confidence DECIMAL(5, 4),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    was_blocked BOOLEAN DEFAULT false,
    block_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_interaction_logs_loan ON ai_interaction_logs(loan_id);
CREATE INDEX idx_ai_interaction_logs_location ON ai_interaction_logs(location_id);
CREATE INDEX idx_ai_interaction_logs_type ON ai_interaction_logs(interaction_type);
CREATE INDEX idx_ai_interaction_logs_created_at ON ai_interaction_logs(created_at);

-- Enable RLS on ai_interaction_logs
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_interaction_logs_tenant_isolation ON ai_interaction_logs
    FOR ALL
    USING (location_id = current_location_id());

CREATE POLICY ai_interaction_logs_service_bypass ON ai_interaction_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Portal Access Logs (track borrower portal access)
CREATE TABLE portal_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES borrowers(id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL, -- 'login', 'document_view', 'document_upload', 'message_sent'
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_portal_access_logs_loan ON portal_access_logs(loan_id);
CREATE INDEX idx_portal_access_logs_borrower ON portal_access_logs(borrower_id);
CREATE INDEX idx_portal_access_logs_created_at ON portal_access_logs(created_at);

-- Enable RLS on portal_access_logs
ALTER TABLE portal_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_access_logs_tenant_isolation ON portal_access_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = portal_access_logs.loan_id
            AND loans.location_id = current_location_id()
        )
    );

CREATE POLICY portal_access_logs_service_bypass ON portal_access_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create Storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY documents_bucket_tenant_policy ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = current_location_id()
    )
    WITH CHECK (
        bucket_id = 'documents' AND
        (storage.foldername(name))[1] = current_location_id()
    );
