// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { supabase } from '../services/supabase.service.js';
import { createError } from '../middleware/errorHandler.middleware.js';
import { logger } from '../utils/logger.js';

const router: ReturnType<typeof Router> = Router();

// Admin JWT payload
interface AdminTokenPayload {
  userId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
}

// Extend Request type for admin routes
interface AdminRequest extends Request {
  admin?: AdminTokenPayload;
}

// =============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// =============================================================================

async function adminAuthMiddleware(
  req: AdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw createError('Admin authentication required', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret) as AdminTokenPayload;

    // Verify admin still exists and is active
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      throw createError('Invalid admin session', 401);
    }

    req.admin = {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.clearCookie('admin_token');
      next(createError('Admin session expired', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid admin token', 401));
    } else {
      next(error);
    }
  }
}

// Role-based access control
function requireRole(...roles: Array<'super_admin' | 'admin' | 'viewer'>) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }
    next();
  };
}

// =============================================================================
// AUTH ROUTES
// =============================================================================

// Login
router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      throw createError('Email and password required', 400);
    }

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, password_hash, is_active')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      logger.warn('Admin login failed: user not found', { email });
      throw createError('Invalid email or password', 401);
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      logger.warn('Admin login failed: invalid password', { email });
      throw createError('Invalid email or password', 401);
    }

    // Generate admin token
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    // Set HTTP-only cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    // Log successful login
    await supabase.from('admin_audit_logs').insert({
      id: uuidv4(),
      admin_user_id: admin.id,
      action: 'login',
      details: { ip: req.ip, userAgent: req.headers['user-agent'] },
    });

    logger.info('Admin login successful', { email, role: admin.role });

    res.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  } catch (error) {
    next(error);
  }
});

// Check auth status
router.get('/auth/me', adminAuthMiddleware, async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('id', req.admin!.userId)
      .single();

    if (error || !admin) {
      throw createError('Admin not found', 404);
    }

    res.json(admin);
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// =============================================================================
// TENANT MANAGEMENT ROUTES
// =============================================================================

// Get all tenants
router.get(
  '/tenants',
  adminAuthMiddleware,
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { data: tenants, error } = await supabase
        .from('ghl_installations')
        .select(`
          id,
          location_id,
          company_id,
          is_active,
          created_at,
          tenant_branding (
            company_name,
            tier,
            subdomain_slug,
            custom_domain,
            domain_verified,
            ssl_status,
            primary_color,
            logo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError('Failed to fetch tenants', 500);
      }

      // Get loan counts per tenant
      const { data: loanCounts } = await supabase
        .from('loans')
        .select('location_id')
        .then(result => {
          const counts: Record<string, number> = {};
          result.data?.forEach(loan => {
            counts[loan.location_id] = (counts[loan.location_id] || 0) + 1;
          });
          return { data: counts };
        });

      const formattedTenants = tenants.map(t => {
        // tenant_branding comes as array from Supabase join, get first element
        const branding = Array.isArray(t.tenant_branding) ? t.tenant_branding[0] : t.tenant_branding;
        return {
          id: t.id,
          locationId: t.location_id,
          companyName: branding?.company_name || 'Unknown',
          tier: branding?.tier || 'basic',
          subdomainSlug: branding?.subdomain_slug,
          customDomain: branding?.custom_domain,
          domainVerified: branding?.domain_verified || false,
          sslStatus: branding?.ssl_status || 'pending',
          primaryColor: branding?.primary_color || '#1976d2',
          logoUrl: branding?.logo_url,
          isActive: t.is_active,
          createdAt: t.created_at,
          loansCount: loanCounts?.[t.location_id] || 0,
          monthlyActiveUsers: 0, // TODO: Implement MAU tracking
        };
      });

      res.json(formattedTenants);
    } catch (error) {
      next(error);
    }
  }
);

// Get single tenant
router.get(
  '/tenants/:id',
  adminAuthMiddleware,
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const { data: tenant, error } = await supabase
        .from('ghl_installations')
        .select(`
          *,
          tenant_branding (*)
        `)
        .eq('id', id)
        .single();

      if (error || !tenant) {
        throw createError('Tenant not found', 404);
      }

      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }
);

// Create tenant (manual creation for testing)
router.post(
  '/tenants',
  adminAuthMiddleware,
  requireRole('super_admin', 'admin'),
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { locationId, companyId, companyName, tier, primaryColor } = req.body;

      if (!locationId || !companyName) {
        throw createError('locationId and companyName are required', 400);
      }

      // Create GHL installation record
      const { data: installation, error: installError } = await supabase
        .from('ghl_installations')
        .insert({
          id: uuidv4(),
          location_id: locationId,
          company_id: companyId || null,
          access_token_encrypted: 'manual_creation_placeholder',
          refresh_token_encrypted: 'manual_creation_placeholder',
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (installError) {
        throw createError('Failed to create tenant: ' + installError.message, 500);
      }

      // Create branding record
      const { error: brandingError } = await supabase
        .from('tenant_branding')
        .insert({
          location_id: locationId,
          company_name: companyName,
          tier: tier || 'basic',
          primary_color: primaryColor || '#1976d2',
        });

      if (brandingError) {
        // Rollback installation
        await supabase.from('ghl_installations').delete().eq('id', installation.id);
        throw createError('Failed to create tenant branding', 500);
      }

      // Log action
      await supabase.from('admin_audit_logs').insert({
        id: uuidv4(),
        admin_user_id: req.admin!.userId,
        action: 'create_tenant',
        details: { locationId, companyName },
      });

      res.status(201).json({
        id: installation.id,
        locationId,
        companyName,
        tier: tier || 'basic',
        isActive: true,
        createdAt: installation.created_at,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update tenant
router.patch(
  '/tenants/:id',
  adminAuthMiddleware,
  requireRole('super_admin', 'admin'),
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { companyName, tier, primaryColor, secondaryColor, logoUrl, isActive } = req.body;

      // Get tenant first
      const { data: tenant, error: fetchError } = await supabase
        .from('ghl_installations')
        .select('location_id')
        .eq('id', id)
        .single();

      if (fetchError || !tenant) {
        throw createError('Tenant not found', 404);
      }

      // Update installation if isActive changed
      if (typeof isActive === 'boolean') {
        await supabase
          .from('ghl_installations')
          .update({ is_active: isActive })
          .eq('id', id);
      }

      // Update branding
      const brandingUpdate: Record<string, unknown> = {};
      if (companyName) brandingUpdate.company_name = companyName;
      if (tier) brandingUpdate.tier = tier;
      if (primaryColor) brandingUpdate.primary_color = primaryColor;
      if (secondaryColor) brandingUpdate.secondary_color = secondaryColor;
      if (logoUrl !== undefined) brandingUpdate.logo_url = logoUrl;

      if (Object.keys(brandingUpdate).length > 0) {
        await supabase
          .from('tenant_branding')
          .update(brandingUpdate)
          .eq('location_id', tenant.location_id);
      }

      // Log action
      await supabase.from('admin_audit_logs').insert({
        id: uuidv4(),
        admin_user_id: req.admin!.userId,
        action: 'update_tenant',
        details: { tenantId: id, changes: req.body },
      });

      res.json({ success: true, id });
    } catch (error) {
      next(error);
    }
  }
);

// Delete tenant
router.delete(
  '/tenants/:id',
  adminAuthMiddleware,
  requireRole('super_admin'),
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('ghl_installations')
        .delete()
        .eq('id', id);

      if (error) {
        throw createError('Failed to delete tenant', 500);
      }

      // Log action
      await supabase.from('admin_audit_logs').insert({
        id: uuidv4(),
        admin_user_id: req.admin!.userId,
        action: 'delete_tenant',
        details: { tenantId: id },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// DOMAIN PROVISIONING ROUTES
// =============================================================================

// Get domain requests
router.get(
  '/domains',
  adminAuthMiddleware,
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { data: domains, error } = await supabase
        .from('domain_requests')
        .select(`
          *,
          tenant_branding!inner (
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        res.json([]);
        return;
      }

      const formatted = domains.map(d => ({
        id: d.id,
        tenantId: d.location_id,
        companyName: d.tenant_branding?.company_name,
        requestedDomain: d.requested_domain,
        status: d.status,
        createdAt: d.created_at,
        dnsRecords: d.dns_records,
      }));

      res.json(formatted);
    } catch (error) {
      next(error);
    }
  }
);

// Provision custom domain
router.post(
  '/domains/provision',
  adminAuthMiddleware,
  requireRole('super_admin', 'admin'),
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, domain } = req.body;

      if (!tenantId || !domain) {
        throw createError('tenantId and domain are required', 400);
      }

      // Get tenant location_id
      const { data: tenant } = await supabase
        .from('ghl_installations')
        .select('location_id')
        .eq('id', tenantId)
        .single();

      if (!tenant) {
        throw createError('Tenant not found', 404);
      }

      // Generate DNS records for verification
      const verificationToken = uuidv4().replace(/-/g, '').substring(0, 16);
      const dnsRecords = [
        {
          type: 'CNAME',
          name: 'portal',
          value: 'portal-proxy.launchmaniac.com',
        },
        {
          type: 'TXT',
          name: '_auma-verify',
          value: verificationToken,
        },
      ];

      // Create domain request
      const { data: request, error } = await supabase
        .from('domain_requests')
        .insert({
          id: uuidv4(),
          location_id: tenant.location_id,
          requested_domain: domain.toLowerCase(),
          status: 'pending',
          dns_records: dnsRecords,
          verification_token: verificationToken,
        })
        .select()
        .single();

      if (error) {
        throw createError('Failed to create domain request', 500);
      }

      // Update tenant branding
      await supabase
        .from('tenant_branding')
        .update({
          custom_domain: domain.toLowerCase(),
          tier: 'enterprise',
        })
        .eq('location_id', tenant.location_id);

      // Log action
      await supabase.from('admin_audit_logs').insert({
        id: uuidv4(),
        admin_user_id: req.admin!.userId,
        action: 'provision_domain',
        details: { tenantId, domain },
      });

      res.status(201).json({
        id: request.id,
        tenantId,
        requestedDomain: domain,
        status: 'pending',
        dnsRecords,
        createdAt: request.created_at,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify domain DNS
router.post(
  '/domains/:id/verify',
  adminAuthMiddleware,
  requireRole('super_admin', 'admin'),
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const { data: request, error } = await supabase
        .from('domain_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !request) {
        throw createError('Domain request not found', 404);
      }

      // TODO: Implement actual DNS verification via Cloudflare API
      // For now, mark as dns_pending
      await supabase
        .from('domain_requests')
        .update({ status: 'dns_pending' })
        .eq('id', id);

      // Log action
      await supabase.from('admin_audit_logs').insert({
        id: uuidv4(),
        admin_user_id: req.admin!.userId,
        action: 'verify_domain',
        details: { requestId: id, domain: request.requested_domain },
      });

      res.json({
        ...request,
        status: 'dns_pending',
      });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// USAGE METRICS ROUTES
// =============================================================================

// Get overall usage stats
router.get(
  '/usage/stats',
  adminAuthMiddleware,
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      // Get tenant counts
      const { count: totalTenants } = await supabase
        .from('ghl_installations')
        .select('*', { count: 'exact', head: true });

      const { count: activeTenants } = await supabase
        .from('ghl_installations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get loan counts
      const { count: totalLoans } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true });

      const { count: activeLoans } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("post_closing","denied")');

      // Get document count
      const { count: documentsProcessed } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      // Get AI call count
      const { count: aiCalls } = await supabase
        .from('ai_interaction_logs')
        .select('*', { count: 'exact', head: true });

      res.json({
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        totalLoans: totalLoans || 0,
        activeLoans: activeLoans || 0,
        documentsProcessed: documentsProcessed || 0,
        aiCalls: aiCalls || 0,
        storageUsedGb: 0, // TODO: Implement storage calculation
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get per-tenant usage
router.get(
  '/usage/tenants',
  adminAuthMiddleware,
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query;

      // Get all tenants with branding
      const { data: tenants } = await supabase
        .from('ghl_installations')
        .select(`
          location_id,
          tenant_branding (company_name)
        `);

      if (!tenants) {
        res.json([]);
        return;
      }

      // Get usage per tenant
      const usage = await Promise.all(
        tenants.map(async (tenant) => {
          const locationId = tenant.location_id;

          // Loans count
          let loansQuery = supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', locationId);

          if (start && end) {
            loansQuery = loansQuery
              .gte('created_at', start as string)
              .lte('created_at', end as string);
          }

          const { count: loansProcessed } = await loansQuery;

          // Documents count
          const { count: documentsUploaded } = await supabase
            .from('documents')
            .select('*, loans!inner(location_id)', { count: 'exact', head: true })
            .eq('loans.location_id', locationId);

          // AI calls count
          const { count: aiCalls } = await supabase
            .from('ai_interaction_logs')
            .select('*', { count: 'exact', head: true })
            .eq('location_id', locationId);

          // tenant_branding comes as array from Supabase join, get first element
          const branding = Array.isArray(tenant.tenant_branding) ? tenant.tenant_branding[0] : tenant.tenant_branding;
          return {
            tenantId: locationId,
            companyName: branding?.company_name || 'Unknown',
            loansProcessed: loansProcessed || 0,
            documentsUploaded: documentsUploaded || 0,
            aiCalls: aiCalls || 0,
            storageUsedMb: 0,
            lastActivity: new Date().toISOString(),
          };
        })
      );

      res.json(usage);
    } catch (error) {
      next(error);
    }
  }
);

export { router as adminRoutes };
