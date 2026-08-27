import type { NextFunction, Request, Response } from 'express';
import { HttpProblem } from '../shared/problem.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export function originGuard(appOrigin: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(request.method)) {
      next();
      return;
    }
    if (request.header('origin') !== appOrigin) {
      next(new HttpProblem(403, 'ORIGIN_REJECTED', 'Nguồn request không được phép.'));
      return;
    }
    next();
  };
}
