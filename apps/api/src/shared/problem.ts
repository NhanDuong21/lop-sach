import type { ErrorCode, ProblemDetails } from '@lop-sach/contracts';

export class HttpProblem extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    detail: string,
  ) { super(detail); }
}

export function problemDetails(problem: HttpProblem, instance: string, requestId: string): ProblemDetails {
  return {
    type: `urn:lop-sach:error:${problem.code.toLowerCase()}`,
    title: problem.code,
    status: problem.status,
    code: problem.code,
    detail: problem.message,
    instance,
    requestId,
  };
}
