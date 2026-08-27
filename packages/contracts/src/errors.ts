import { z } from 'zod';

export const ERROR_CODES = [
  'INVALID_JSON',
  'AUTH_REQUIRED',
  'INVALID_CREDENTIALS',
  'ORIGIN_REJECTED',
  'PROXY_AUTH_REQUIRED',
  'RESOURCE_NOT_FOUND',
  'VERSION_CONFLICT',
  'WEEK_ALREADY_EXISTS',
  'INVALID_WEEK_TRANSITION',
  'GROUP_IN_USE',
  'GENERATION_CONTEXT_STALE',
  'PROPOSAL_MISMATCH',
  'SCHEDULER_VERSION_OUTDATED',
  'LOCKED_ASSIGNMENTS_BLOCK_GROUP_CHANGE',
  'VALIDATION_FAILED',
  'HARD_CONSTRAINT_VIOLATION',
  'INVALID_LOCKED_ASSIGNMENT',
  'BACKUP_INCOMPATIBLE',
  'DUTY_WEEK_SIZE_LIMIT',
  'RATE_LIMITED',
  'DEPENDENCY_UNAVAILABLE',
  'PROXY_UPSTREAM_UNAVAILABLE',
  'PROXY_ROUTE_NOT_ALLOWED',
  'MIGRATION_FAILED',
  'MIGRATION_CHECKSUM_MISMATCH',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export const ErrorCodeSchema = z.enum(ERROR_CODES);

export const ProblemFieldSchema = z.strictObject({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});

export const ProblemDetailsSchema = z.strictObject({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  code: ErrorCodeSchema,
  detail: z.string(),
  instance: z.string(),
  requestId: z.string(),
  errors: z.array(ProblemFieldSchema).optional(),
  action: z.enum(['RELOAD_REQUIRED']).optional(),
  serverSchedulerEngineVersion: z.string().optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
