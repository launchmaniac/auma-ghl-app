-- Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
-- AUMA GHL Marketplace App - Security Fixes
-- Fixes: RLS on ghl_installations, search_path on functions

-- =============================================================================
-- FIX 1: Enable RLS on ghl_installations table
-- =============================================================================

ALTER TABLE ghl_installations ENABLE ROW LEVEL SECURITY;

-- ghl_installations: Access by location_id
-- Note: This table contains sensitive OAuth tokens, so we use service_role bypass
-- and restrict anonymous/authenticated access
CREATE POLICY ghl_installations_tenant_isolation ON ghl_installations
    FOR ALL
    USING (location_id = current_location_id());

CREATE POLICY ghl_installations_service_bypass ON ghl_installations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- FIX 2: Recreate functions with immutable search_path
-- =============================================================================

-- Fix: update_updated_at_column (from 001_initial_schema.sql)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = public;

-- Fix: current_location_id (from 002_rls_policies.sql)
CREATE OR REPLACE FUNCTION public.current_location_id()
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN current_setting('app.current_location_id', true);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- Fix: log_loan_status_change (from 003_audit_tables.sql)
CREATE OR REPLACE FUNCTION public.log_loan_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.loan_status_history (loan_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = public;

-- =============================================================================
-- VERIFICATION: Check that fixes were applied
-- =============================================================================

-- You can verify the fixes by running:
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
-- WHERE proname IN ('update_updated_at_column', 'current_location_id', 'log_loan_status_change');

-- And verify RLS:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'ghl_installations';
