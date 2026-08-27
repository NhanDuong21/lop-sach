import type { NextFunction, Request, Response } from 'express';
import { HttpProblem } from '../shared/problem.js';
export function notFound(request: Request, _response: Response, next: NextFunction): void {
  next(new HttpProblem(404, 'RESOURCE_NOT_FOUND', `Không tìm thấy ${request.method} ${request.path}.`));
}
