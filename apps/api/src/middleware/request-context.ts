import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.header('x-request-id');
  const requestId = incoming && /^[a-zA-Z0-9._-]{1,100}$/u.test(incoming) ? incoming : randomUUID();
  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  response.setHeader('Cache-Control', 'no-store');
  next();
}
