import type { NextFunction, Request, Response } from 'express';
import { HttpProblem } from '../shared/problem.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export function jsonOnly(request: Request, _response: Response, next: NextFunction): void {
  if (MUTATION_METHODS.has(request.method) && !request.is('application/json')) {
    next(
      new HttpProblem(415, 'VALIDATION_FAILED', 'Request phải dùng Content-Type application/json.'),
    );
    return;
  }
  next();
}
