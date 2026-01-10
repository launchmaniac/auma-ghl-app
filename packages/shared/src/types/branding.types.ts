// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export type BrandingTier = 'basic' | 'professional' | 'enterprise';

export type SslStatus = 'pending' | 'provisioning' | 'active' | 'failed';

export interface TenantBranding {
  locationId: string;

  // Basic Branding (self-service)
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;

  // Professional Tier
  subdomainSlug?: string;

  // Enterprise Tier (admin-managed)
  customDomain?: string;
  domainVerified: boolean;
  cloudflareZoneId?: string;
  sslStatus: SslStatus;

  // Tier tracking
  tier: BrandingTier;

  createdAt: Date;
  updatedAt: Date;
}

export interface TenantBrandingCreateInput {
  locationId: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TenantBrandingUpdateInput {
  companyName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  subdomainSlug?: string;
}

export interface CustomDomainSetupInput {
  locationId: string;
  customDomain: string;
}

export interface DomainVerificationResult {
  verified: boolean;
  dnsRecords: {
    type: 'CNAME' | 'TXT';
    name: string;
    value: string;
    found: boolean;
  }[];
  sslStatus: SslStatus;
}

export interface PortalTheme {
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}
