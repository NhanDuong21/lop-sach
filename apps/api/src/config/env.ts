import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const localEnvironmentFile = fileURLToPath(new URL('../../.env', import.meta.url));

function loadProcessEnvironment(): NodeJS.ProcessEnv {
  if (process.env.NODE_ENV !== 'production' && existsSync(localEnvironmentFile)) {
    loadEnvFile(localEnvironmentFile);
  }
  return process.env;
}

const EnvSchema = z
  .strictObject({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGODB_URI: z.string().min(1),
    APP_ORIGIN: z.string().url(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    LOP_SACH_PROXY_SECRET: z.string().min(32).optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production') {
      if (!value.APP_ORIGIN.startsWith('https://')) {
        context.addIssue({
          code: 'custom',
          path: ['APP_ORIGIN'],
          message: 'Production APP_ORIGIN phải dùng HTTPS.',
        });
      }
      if (!value.LOP_SACH_PROXY_SECRET) {
        context.addIssue({
          code: 'custom',
          path: ['LOP_SACH_PROXY_SECRET'],
          message: 'Production cần proxy secret.',
        });
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

export function loadConfig(environment: NodeJS.ProcessEnv = loadProcessEnvironment()): AppConfig {
  const value = EnvSchema.parse({
    NODE_ENV: environment.NODE_ENV,
    PORT: environment.PORT,
    MONGODB_URI: environment.MONGODB_URI,
    APP_ORIGIN: environment.APP_ORIGIN,
    LOG_LEVEL: environment.LOG_LEVEL,
    LOP_SACH_PROXY_SECRET: environment.LOP_SACH_PROXY_SECRET,
  });
  return {
    environment: value.NODE_ENV,
    port: value.PORT,
    mongoUri: value.MONGODB_URI,
    appOrigin: value.APP_ORIGIN,
    logLevel: value.LOG_LEVEL,
    ...(value.LOP_SACH_PROXY_SECRET ? { proxySecret: value.LOP_SACH_PROXY_SECRET } : {}),
  };
}
