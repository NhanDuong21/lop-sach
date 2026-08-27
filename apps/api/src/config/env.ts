import { z } from 'zod';

const EnvSchema = z
  .strictObject({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: z.string().min(1),
    APP_ORIGIN: z.string().url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    LOP_SACH_PROXY_SECRET: z.string().min(32).optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production') {
      if (!value.APP_ORIGIN.startsWith('https://')) {
        context.addIssue({ code: 'custom', path: ['APP_ORIGIN'], message: 'Production APP_ORIGIN phải dùng HTTPS.' });
      }
      if (!value.LOP_SACH_PROXY_SECRET) {
        context.addIssue({ code: 'custom', path: ['LOP_SACH_PROXY_SECRET'], message: 'Production cần proxy secret.' });
      }
    }
  });

export interface AppConfig {
  readonly environment: 'development' | 'test' | 'production';
  readonly port: number;
  readonly mongoUri: string;
  readonly appOrigin: string;
  readonly logLevel: string;
  readonly proxySecret?: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const value = EnvSchema.parse(environment);
  return {
    environment: value.NODE_ENV,
    port: value.PORT,
    mongoUri: value.MONGODB_URI,
    appOrigin: value.APP_ORIGIN,
    logLevel: value.LOG_LEVEL,
    ...(value.LOP_SACH_PROXY_SECRET ? { proxySecret: value.LOP_SACH_PROXY_SECRET } : {}),
  };
}
