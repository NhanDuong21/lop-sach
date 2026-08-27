import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from '../config/env.js';
import { errorHandler } from '../middleware/error-handler.js';
import { generalRateLimit } from '../middleware/rate-limits.js';
import { jsonOnly } from '../middleware/json-only.js';
import { notFound } from '../middleware/not-found.js';
import { originGuard } from '../middleware/origin-guard.js';
import { proxyAuth } from '../middleware/proxy-auth.js';
import { requestContext } from '../middleware/request-context.js';
import { createHealthRouter } from '../modules/health/health.routes.js';
import { createApiRouter } from './routes.js';

export function createApp(
  config: AppConfig,
  options: { readonly rateLimits?: boolean } = {},
): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.environment === 'production' ? 1 : false);
  const logger = pino({
    level: config.logLevel,
    redact: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["x-lop-sach-proxy-secret"]',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
    ],
  });
  app.use(helmet());
  app.use(requestContext);
  app.use(pinoHttp({ logger, autoLogging: false }));
  app.use('/api/v1/backup', express.json({ limit: '2mb', strict: true }));
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use(cookieParser());
  app.use('/health', createHealthRouter());
  app.use('/api/v1', proxyAuth(config));
  if (options.rateLimits !== false) app.use('/api/v1', generalRateLimit);
  app.use('/api/v1', jsonOnly, originGuard(config.appOrigin), createApiRouter(config, options));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
