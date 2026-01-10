// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ghlService } from '../services/ghl.service.js';
import { supabase } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.middleware.js';

const router: RouterType = Router();

// GHL OAuth callback - handles app installation
router.get('/ghl/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      throw createError('Missing authorization code', 400);
    }

    // Exchange code for tokens via GHL SDK
    const tokens = await ghlService.exchangeCode(code);

    // Save tokens to database
    await ghlService.saveTokens(tokens.locationId, tokens);

    // Create default branding entry for new installation
    await supabase.from('tenant_branding').upsert({
      location_id: tokens.locationId,
      company_name: 'New Mortgage Company',
      tier: 'basic',
    }, { onConflict: 'location_id' });

    logger.info('GHL app installed successfully', {
      locationId: tokens.locationId,
    });

    // Generate session JWT for the app
    const sessionToken = jwt.sign(
      {
        locationId: tokens.locationId,
        companyId: tokens.companyId,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    // Redirect to app dashboard with session
    res.redirect(
      `${config.portalUrl}/app?session=${sessionToken}&locationId=${tokens.locationId}`
    );
  } catch (error) {
    next(error);
  }
});

// Get current session info
router.get('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No session token', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as {
      locationId: string;
      companyId?: string;
    };

    // Get installation details
    const { data: installation, error } = await supabase
      .from('ghl_installations')
      .select('location_id, company_id, installed_at, is_active')
      .eq('location_id', decoded.locationId)
      .single();

    if (error || !installation) {
      throw createError('Installation not found', 404);
    }

    // Get branding
    const { data: branding } = await supabase
      .from('tenant_branding')
      .select('*')
      .eq('location_id', decoded.locationId)
      .single();

    res.json({
      success: true,
      session: {
        locationId: installation.location_id,
        companyId: installation.company_id,
        installedAt: installation.installed_at,
        isActive: installation.is_active,
        branding,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh session token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No session token', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify existing token (allow expired tokens for refresh)
    const decoded = jwt.verify(token, config.jwtSecret, {
      ignoreExpiration: true,
    }) as {
      locationId: string;
      companyId?: string;
    };

    // Verify installation is still active
    const { data: installation, error } = await supabase
      .from('ghl_installations')
      .select('is_active')
      .eq('location_id', decoded.locationId)
      .single();

    if (error || !installation || !installation.is_active) {
      throw createError('Installation inactive', 401);
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        locationId: decoded.locationId,
        companyId: decoded.companyId,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
