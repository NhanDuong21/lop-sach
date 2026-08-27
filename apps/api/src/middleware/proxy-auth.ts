import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from '../config/env.js';
import { HttpProblem } from '../shared/problem.js';

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function proxyAuth(config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (config.environment !== 'production') {
      next();
      return;
    }
    const supplied = request.header('x-lop-sach-proxy-secret') ?? '';
    if (!config.proxySecret || !secureEqual(supplied, config.proxySecret)) {
      next(new HttpProblem(403, 'PROXY_AUTH_REQUIRED', 'Request không đi qua proxy tin cậy.'));
      return;
    }
    next();
  };
}
