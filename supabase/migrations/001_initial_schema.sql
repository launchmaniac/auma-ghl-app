-- Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com
-- AUMA GHL Marketplace App - Initial Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE loan_status AS ENUM (
    'lead',
    'initial_call',
    'app_in',
    'post_app_call',
    'notes_to_lo',
    'pre_approval_prep',
    'in_contract',
    'pipeline_mgmt',
    'final_approval',
    'post_closing',
    'denied'
);

CREATE TYPE loan_purpose AS ENUM (
    'purchase',
    'refinance',
    'cash_out_refinance',
    'home_equity'
);

CREATE TYPE loan_type AS ENUM (
    'conventional',
    'fha',
    'va',
    'usda',
    'jumbo',
    'other'
);

CREATE TYPE borrower_type AS ENUM (
    'primary',
    'co_borrower'
);

CREATE TYPE document_category AS ENUM (
    'income',
    'asset',
    'identity',
    'property',
    'legal',
    'other'
);

CREATE TYPE ocr_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

CREATE TYPE validation_status AS ENUM (
    'pending',
    'valid',
    'needs_review',
    'invalid'
);

CREATE TYPE branding_tier AS ENUM (
    'basic',
    'professional',
    'enterprise'
);

-- GHL Installations (OAuth tokens per location)
CREATE TABLE ghl_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id VARCHAR(50) UNIQUE NOT NULL,
    company_id VARCHAR(50),
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ghl_installations_location ON ghl_installations(location_id);

-- Tenant Branding (white-label configuration)
CREATE TABLE tenant_branding (
    location_id VARCHAR(50) PRIMARY KEY REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#424242',
    subdomain_slug VARCHAR(50) UNIQUE,
    custom_domain VARCHAR(255) UNIQUE,
    domain_verified BOOLEAN DEFAULT false,
    cloudflare_zone_id VARCHAR(50),
    ssl_status VARCHAR(20) DEFAULT 'pending',
    tier branding_tier DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenant_branding_subdomain ON tenant_branding(subdomain_slug);
CREATE INDEX idx_tenant_branding_domain ON tenant_branding(custom_domain);

-- MLO Users (licensed loan officers)
CREATE TABLE mlo_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    ghl_user_id VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    nmls_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mlo_users_location ON mlo_users(location_id);
CREATE INDEX idx_mlo_users_email ON mlo_users(email);

-- Loans (main loan records)
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    ghl_contact_id VARCHAR(50) NOT NULL,
    ghl_opportunity_id VARCHAR(50),
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    status loan_status NOT NULL DEFAULT 'lead',
    loan_purpose loan_purpose,
    loan_type loan_type,
    property_address TEXT,
    property_city VARCHAR(100),
    property_state VARCHAR(2),
    property_zip VARCHAR(10),
    estimated_value DECIMAL(12, 2),
    loan_amount DECIMAL(12, 2),
    down_payment DECIMAL(12, 2),
    estimated_close_date DATE,
    assigned_mlo_id UUID REFERENCES mlo_users(id),
    referral_source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loans_location ON loans(location_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_ghl_contact ON loans(ghl_contact_id);
CREATE INDEX idx_loans_number ON loans(loan_number);
CREATE INDEX idx_loans_assigned_mlo ON loans(assigned_mlo_id);

-- Borrowers
CREATE TABLE borrowers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_type borrower_type NOT NULL DEFAULT 'primary',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    ssn_last_four VARCHAR(4),
    current_address TEXT,
    years_at_address DECIMAL(4, 2),
    employer_name VARCHAR(255),
    employer_phone VARCHAR(20),
    employment_start_date DATE,
    job_title VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_borrowers_loan ON borrowers(loan_id);
CREATE INDEX idx_borrowers_email ON borrowers(email);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES borrowers(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL,
    document_category document_category NOT NULL DEFAULT 'other',
    original_file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    ocr_status ocr_status DEFAULT 'pending',
    ocr_confidence_score DECIMAL(5, 4),
    ocr_data JSONB,
    validation_status validation_status DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]'::jsonb,
    uploaded_by VARCHAR(100),
    upload_source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_loan ON documents(loan_id);
CREATE INDEX idx_documents_borrower ON documents(borrower_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_ocr_status ON documents(ocr_status);

-- Income Calculations
CREATE TABLE income_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES borrowers(id) ON DELETE SET NULL,
    income_type VARCHAR(50) NOT NULL,
    monthly_income DECIMAL(12, 2) NOT NULL,
    annual_income DECIMAL(12, 2) NOT NULL,
    confidence DECIMAL(5, 4),
    methodology TEXT,
    notes JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    requires_review BOOLEAN DEFAULT false,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculated_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_income_calculations_loan ON income_calculations(loan_id);
CREATE INDEX idx_income_calculations_borrower ON income_calculations(borrower_id);

-- Loan Conditions
CREATE TABLE loan_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    condition_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    borrower_visible BOOLEAN DEFAULT true,
    satisfied_at TIMESTAMP WITH TIME ZONE,
    satisfied_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loan_conditions_loan ON loan_conditions(loan_id);
CREATE INDEX idx_loan_conditions_status ON loan_conditions(status);

-- Escalations (SAFE Act and other escalations)
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    escalation_type VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to UUID REFERENCES mlo_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escalations_loan ON escalations(loan_id);
CREATE INDEX idx_escalations_location ON escalations(location_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_escalations_type ON escalations(escalation_type);

-- Portal Messages
CREATE TABLE portal_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES borrowers(id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
    blocked BOOLEAN DEFAULT false,
    block_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_portal_messages_loan ON portal_messages(loan_id);
CREATE INDEX idx_portal_messages_borrower ON portal_messages(borrower_id);

-- Compliance Violations (audit trail for SAFE Act)
CREATE TABLE compliance_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    location_id VARCHAR(50) NOT NULL REFERENCES ghl_installations(location_id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL,
    content TEXT,
    violations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_compliance_violations_loan ON compliance_violations(loan_id);
CREATE INDEX idx_compliance_violations_location ON compliance_violations(location_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_ghl_installations_updated_at BEFORE UPDATE ON ghl_installations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_branding_updated_at BEFORE UPDATE ON tenant_branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mlo_users_updated_at BEFORE UPDATE ON mlo_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_borrowers_updated_at BEFORE UPDATE ON borrowers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_calculations_updated_at BEFORE UPDATE ON income_calculations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loan_conditions_updated_at BEFORE UPDATE ON loan_conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escalations_updated_at BEFORE UPDATE ON escalations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
