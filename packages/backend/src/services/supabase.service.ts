// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Development mode flag
const isDevelopment = config.nodeEnv === 'development';
const isMockMode = isDevelopment && (!config.supabase.url || !config.supabase.serviceRoleKey);

if (isMockMode) {
  logger.warn('Supabase not configured - running in mock mode. Database operations will fail.');
}

// Create Supabase client (uses placeholder URL in mock mode for TypeScript)
export const supabase: SupabaseClient = createClient(
  config.supabase.url || 'http://localhost:54321',
  config.supabase.serviceRoleKey || 'mock-key-for-development',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to set tenant context for RLS
export async function setTenantContext(locationId: string): Promise<void> {
  if (isMockMode) {
    logger.debug('Supabase mock mode - skipping tenant context', { locationId });
    return;
  }
  await supabase.rpc('set_config', {
    setting: 'app.current_location_id',
    value: locationId,
  });
}

// Create a client with tenant context already set
export async function getSupabaseForLocation(locationId: string): Promise<SupabaseClient> {
  await setTenantContext(locationId);
  return supabase;
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !isMockMode;
}
