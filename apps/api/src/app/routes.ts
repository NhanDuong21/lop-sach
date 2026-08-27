import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';

export function createApiRouter(config: AppConfig): Router {
  const router = Router();
  router.use('/auth', createAuthRouter(config));
  return router;
}
