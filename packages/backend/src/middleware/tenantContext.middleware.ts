// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './ghlAuth.middleware.js';
import { setTenantContext } from '../services/supabase.service.js';
import { createError } from './errorHandler.middleware.js';

export async function tenantContextMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.locationId) {
      throw createError('No location context found', 400);
    }

    // Set Supabase RLS context for this request
    await setTenantContext(req.locationId);

    next();
  } catch (error) {
    next(error);
  }
}
