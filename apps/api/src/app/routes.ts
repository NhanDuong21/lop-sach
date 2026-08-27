import { Router } from 'express';
import type { AppConfig } from '../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { sessionCookiePolicy } from '../modules/auth/cookie-policy.js';
import { createClassroomRouter } from '../modules/classroom/classroom.routes.js';
import { createDutyWeekRouter } from '../modules/duty-weeks/duty-week.routes.js';
import { createStudentRouter } from '../modules/students/student.routes.js';
import { createTaskTemplateRouter } from '../modules/task-templates/task-template.routes.js';

export function createApiRouter(
  config: AppConfig,
  options: { readonly rateLimits?: boolean } = {},
): Router {
  const router = Router();
  router.use('/auth', createAuthRouter(config, options));
  const requireAuth = authenticate(sessionCookiePolicy(config.environment));
  router.use('/classroom', requireAuth, createClassroomRouter());
  router.use('/students', requireAuth, createStudentRouter());
  router.use('/task-templates', requireAuth, createTaskTemplateRouter());
  router.use('/duty-weeks', requireAuth, createDutyWeekRouter());
  return router;
}
