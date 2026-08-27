import { Router } from 'express';
import { isDatabaseReady } from '../../database/connect.js';

export function createHealthRouter(): Router {
  const router = Router();
  router.get('/live', (_request, response) => response.json({ status: 'ok' }));
  router.get('/ready', (_request, response) => {
    if (!isDatabaseReady()) { response.status(503).json({ status: 'unavailable', code: 'DEPENDENCY_UNAVAILABLE' }); return; }
    response.json({ status: 'ready' });
  });
  return router;
}
