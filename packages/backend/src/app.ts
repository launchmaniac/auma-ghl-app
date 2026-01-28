// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { authRoutes } from './routes/auth.routes.js';
import { loanRoutes } from './routes/loans.routes.js';
import { documentRoutes } from './routes/documents.routes.js';
import { portalRoutes } from './routes/portal.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    config.portalUrl,
    'https://auma.launchmaniac.com',
    'https://admin.launchmaniac.com',
    'https://app.launchmaniac.com',
    'https://app.gohighlevel.com',
    'https://*.gohighlevel.com',
  ],
  credentials: true,
}));
app.use(cookieParser());

// Health check (before rate limiter to avoid self-blocking)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  logger.info(`AUMA Backend API running on port ${PORT}`);
});

export { app };
