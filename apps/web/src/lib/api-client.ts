import { ProblemDetailsSchema, type ProblemDetails } from '@lop-sach/contracts';

export class ApiError extends Error {
  public constructor(public readonly problem: ProblemDetails) {
    super(problem.detail);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (!navigator.onLine && !['GET', 'HEAD', 'OPTIONS'].includes(method))
    throw new Error('Không thể thay đổi dữ liệu khi ngoại tuyến.');
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json();
  if (!response.ok) {
    const problem = ProblemDetailsSchema.safeParse(body);
    if (problem.success) throw new ApiError(problem.data);
    throw new Error('Máy chủ trả về phản hồi không hợp lệ.');
  }
  return body as T;
}
