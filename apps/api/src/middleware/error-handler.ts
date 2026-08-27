import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpProblem, problemDetails } from '../shared/problem.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next): void => {
  void next;
  const requestId = String(response.locals.requestId ?? 'unknown');
  if (error instanceof ZodError) {
    response.status(422).json({
      ...problemDetails(new HttpProblem(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.'), request.originalUrl, requestId),
      errors: error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code, message: issue.message })),
    });
    return;
  }
  const problem = error instanceof HttpProblem ? error : new HttpProblem(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi máy chủ.');
  response.status(problem.status).json(problemDetails(problem, request.originalUrl, requestId));
};
