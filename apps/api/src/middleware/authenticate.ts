import type { NextFunction, Request, Response } from 'express';
import type { SessionCookiePolicy } from '../modules/auth/cookie-policy.js';
import { authenticateToken } from '../modules/auth/auth.service.js';
import { HttpProblem } from '../shared/problem.js';

export interface AuthenticatedUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
}

export function authenticate(cookiePolicy: SessionCookiePolicy) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const token = request.cookies[cookiePolicy.name] as string | undefined;
      if (!token) throw new HttpProblem(401, 'AUTH_REQUIRED', 'Cần đăng nhập để tiếp tục.');
      const user = await authenticateToken(token);
      if (!user) throw new HttpProblem(401, 'AUTH_REQUIRED', 'Phiên đăng nhập không còn hiệu lực.');
      response.locals.user = user;
      response.locals.sessionToken = token;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authenticatedUser(response: Response): AuthenticatedUser {
  return response.locals.user as AuthenticatedUser;
}
