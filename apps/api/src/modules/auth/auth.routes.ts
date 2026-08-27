import { Router } from 'express';
import { ChangePasswordRequestSchema, LoginRequestSchema } from '@lop-sach/contracts';
import type { AppConfig } from '../../config/env.js';
import { authenticate, authenticatedUser } from '../../middleware/authenticate.js';
import { loginRateLimit } from '../../middleware/rate-limits.js';
import { HttpProblem } from '../../shared/problem.js';
import {
  createSession,
  revokeAllSessions,
  revokeSession,
  verifyPassword,
  hashPassword,
  normalizeUsername,
} from './auth.service.js';
import { sessionCookiePolicy } from './cookie-policy.js';
import { UserModel } from './user.model.js';
import { ClassroomModel } from '../classroom/classroom.model.js';

async function classroomStatus(
  userId: string,
): Promise<{ readonly hasClassroom: boolean; readonly onboardingCompleted: boolean }> {
  const classroom = await ClassroomModel.findOne({ ownerId: userId })
    .select({ 'onboarding.completedAt': 1 })
    .lean();
  return {
    hasClassroom: Boolean(classroom),
    onboardingCompleted: Boolean(classroom?.onboarding?.completedAt),
  };
}

export function createAuthRouter(
  config: AppConfig,
  options: { readonly rateLimits?: boolean } = {},
): Router {
  const router = Router();
  const cookie = sessionCookiePolicy(config.environment);
  const requireAuth = authenticate(cookie);

  router.post(
    '/login',
    ...(options.rateLimits === false ? [] : [loginRateLimit]),
    async (request, response, next) => {
      try {
        const input = LoginRequestSchema.parse(request.body);
        const user = await UserModel.findOne({
          normalizedUsername: normalizeUsername(input.username),
        }).lean();
        if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
          throw new HttpProblem(
            401,
            'INVALID_CREDENTIALS',
            'Tên đăng nhập hoặc mật khẩu không đúng.',
          );
        }
        const session = await createSession(String(user._id));
        const status = await classroomStatus(String(user._id));
        response.cookie(cookie.name, session.token, cookie.options);
        response.status(200).json({
          data: {
            id: String(user._id),
            displayName: user.displayName,
            username: user.username,
            ...status,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/logout', requireAuth, async (_request, response, next) => {
    try {
      await revokeSession(String(response.locals.sessionToken));
      response.clearCookie(cookie.name, { ...cookie.options, maxAge: undefined });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuth, async (_request, response, next) => {
    try {
      const user = authenticatedUser(response);
      response.json({ data: { ...user, ...(await classroomStatus(user.id)) } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/change-password', requireAuth, async (request, response, next) => {
    try {
      const input = ChangePasswordRequestSchema.parse(request.body);
      const authUser = authenticatedUser(response);
      const user = await UserModel.findById(authUser.id);
      if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
        throw new HttpProblem(401, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không đúng.');
      }
      user.passwordHash = await hashPassword(input.newPassword);
      await user.save();
      await revokeAllSessions(authUser.id);
      response.clearCookie(cookie.name, { ...cookie.options, maxAge: undefined });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  return router;
}
