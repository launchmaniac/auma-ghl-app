// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { createError } from './errorHandler.middleware.js';
import { supabase } from '../services/supabase.service.js';

export interface AuthenticatedRequest extends Request {
  locationId?: string;
  userId?: string;
  userRole?: string;
}

export async function ghlAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT
    const decoded = jwt.verify(token, config.jwtSecret) as {
      locationId: string;
      userId?: string;
      role?: string;
    };

    // Verify the location is still active
    const { data: installation, error } = await supabase
      .from('ghl_installations')
      .select('is_active')
      .eq('location_id', decoded.locationId)
      .single();

    if (error || !installation || !installation.is_active) {
      throw createError('GHL installation not found or inactive', 401);
    }

    // Attach location context to request
    req.locationId = decoded.locationId;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
}

// Middleware to ensure MLO role for certain actions
export function requireMloRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== 'mlo' && req.userRole !== 'admin') {
    return next(createError('This action requires MLO privileges', 403));
  }
  next();
}
