-- Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
-- AUMA GHL Marketplace App - Row Level Security Policies

-- Enable RLS on all tenant-scoped tables
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

-- Function to get current location_id from request context
-- This is set by the backend before each request
CREATE OR REPLACE FUNCTION current_location_id()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN current_setting('app.current_location_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loans: Full isolation by location_id
CREATE POLICY loans_tenant_isolation ON loans
    FOR ALL
    USING (location_id = current_location_id());

-- Borrowers: Access through loan's location
CREATE POLICY borrowers_tenant_isolation ON borrowers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = borrowers.loan_id
            AND loans.location_id = current_location_id()
        )
    );

-- Documents: Access through loan's location
CREATE POLICY documents_tenant_isolation ON documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = documents.loan_id
            AND loans.location_id = current_location_id()
        )
    );

-- Income Calculations: Access through loan's location
CREATE POLICY income_calculations_tenant_isolation ON income_calculations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = income_calculations.loan_id
            AND loans.location_id = current_location_id()
        )
    );

-- Loan Conditions: Access through loan's location
CREATE POLICY loan_conditions_tenant_isolation ON loan_conditions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = loan_conditions.loan_id
            AND loans.location_id = current_location_id()
        )
    );

-- Escalations: Full isolation by location_id
CREATE POLICY escalations_tenant_isolation ON escalations
    FOR ALL
    USING (location_id = current_location_id());

-- Portal Messages: Access through loan's location
CREATE POLICY portal_messages_tenant_isolation ON portal_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM loans
            WHERE loans.id = portal_messages.loan_id
            AND loans.location_id = current_location_id()
        )
    );

-- Compliance Violations: Full isolation by location_id
CREATE POLICY compliance_violations_tenant_isolation ON compliance_violations
    FOR ALL
    USING (location_id = current_location_id());

-- MLO Users: Full isolation by location_id
CREATE POLICY mlo_users_tenant_isolation ON mlo_users
    FOR ALL
    USING (location_id = current_location_id());

-- Tenant Branding: Full isolation by location_id
CREATE POLICY tenant_branding_tenant_isolation ON tenant_branding
    FOR ALL
    USING (location_id = current_location_id());

-- Service role bypass policies (for internal operations)
-- These allow the service role to access all data when needed

CREATE POLICY loans_service_bypass ON loans
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY borrowers_service_bypass ON borrowers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY documents_service_bypass ON documents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY income_calculations_service_bypass ON income_calculations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY loan_conditions_service_bypass ON loan_conditions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY escalations_service_bypass ON escalations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY portal_messages_service_bypass ON portal_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY compliance_violations_service_bypass ON compliance_violations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY mlo_users_service_bypass ON mlo_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY tenant_branding_service_bypass ON tenant_branding
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
