-- Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
-- AUMA GHL Marketplace App - Admin Tables

-- =============================================================================
-- ADMIN USERS TABLE
-- =============================================================================

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- Trigger for updated_at
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ADMIN AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_user ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

-- =============================================================================
-- DOMAIN REQUESTS TABLE
-- =============================================================================

CREATE TABLE domain_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    requested_domain VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dns_pending', 'verified', 'failed')),
    dns_records JSONB,
    verification_token VARCHAR(50),
    cloudflare_zone_id VARCHAR(50),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_domain_requests_location ON domain_requests(location_id);
CREATE INDEX idx_domain_requests_status ON domain_requests(status);
CREATE INDEX idx_domain_requests_domain ON domain_requests(requested_domain);

-- Trigger for updated_at
CREATE TRIGGER update_domain_requests_updated_at
    BEFORE UPDATE ON domain_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS POLICIES (Admin tables are internal, service role only)
-- =============================================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_requests ENABLE ROW LEVEL SECURITY;

-- Service role bypass for all admin tables
CREATE POLICY admin_users_service_bypass ON admin_users
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY admin_audit_logs_service_bypass ON admin_audit_logs
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY domain_requests_service_bypass ON domain_requests
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Domain requests also accessible by tenant isolation for future use
CREATE POLICY domain_requests_tenant_isolation ON domain_requests
    FOR ALL
    USING (location_id = current_location_id());

-- =============================================================================
-- CREATE INITIAL SUPER ADMIN USER
-- Password: Admin123! (bcrypt hash)
-- IMPORTANT: Change this password immediately after first login!
-- =============================================================================

INSERT INTO admin_users (id, email, name, password_hash, role, is_active)
VALUES (
    uuid_generate_v4(),
    'admin@launchmaniac.com',
    'Launch Maniac Admin',
    '$2a$10$ucXD0Kb91BTzbC/JE66TFel.viBBYqf8155b731xtq/RcxJpYJMgy',
    'super_admin',
    true
);

-- Default password: Admin123! - IMPORTANT: Change this immediately after first login!
