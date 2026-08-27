import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env.js';

describe('environment configuration', () => {
  it('accepts a normal process environment while reading only application keys', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      PORT: '3100',
      MONGODB_URI: 'mongodb://127.0.0.1:27018/lop_sach_test',
      APP_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'debug',
      OWNER_USERNAME: 'owner',
    });

    expect(config).toEqual({
      environment: 'development',
      port: 3100,
      mongoUri: 'mongodb://127.0.0.1:27018/lop_sach_test',
      appOrigin: 'http://localhost:5173',
      logLevel: 'debug',
    });
  });
});
