// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // GHL OAuth (nested for organization)
  ghl: {
    clientId: process.env.GHL_CLIENT_ID || '',
    clientSecret: process.env.GHL_CLIENT_SECRET || '',
    redirectUri: process.env.GHL_REDIRECT_URI || '',
    appId: process.env.GHL_APP_ID || '',
  },

  // Deepseek AI (nested for organization)
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat-v3.2',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  },

  // Deepseek AI (flat access for services)
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat-v3.2',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',

  // Supabase (nested for organization)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Supabase (flat access for services)
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Portal
  portalUrl: process.env.PORTAL_URL || 'https://portal.launchmaniac.com',

  // Notifications (nested for organization)
  smtp2go: {
    apiKey: process.env.SMTP2GO_API_KEY || '',
    sender: process.env.SMTP2GO_SENDER || 'noreply@launchmaniac.com',
  },

  // Notifications (flat access for services)
  smtp2goApiKey: process.env.SMTP2GO_API_KEY || '',
  smtp2goSender: process.env.SMTP2GO_SENDER || 'noreply@launchmaniac.com',

  // Cloudflare (nested for organization)
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    zoneTemplateId: process.env.CLOUDFLARE_ZONE_TEMPLATE_ID || '',
  },

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
};

// Validate required config in production
if (config.nodeEnv === 'production') {
  const required = [
    'GHL_CLIENT_ID',
    'GHL_CLIENT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
